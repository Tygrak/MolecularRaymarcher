@binding(0) @group(0) var<uniform> mvpMatrix : mat4x4<f32>;
@binding(1) @group(0) var<uniform> inverseVpMatrix : mat4x4<f32>;
@binding(2) @group(0) var<uniform> cameraPos : vec4<f32>;

struct Atom {
    position: vec3<f32>,
    number: f32,
}

struct Atoms {
    atoms: array<Atom>,
}

@binding(0) @group(1) var<storage, read> atoms : Atoms;

struct Bin {
    min: vec3<f32>,
    start: f32,
    max: vec3<f32>,
    end: f32,
}

struct Bins {
    bins: array<Bin>,
}

@binding(1) @group(1) var<storage, read> bins : Bins;

struct DrawSettings {
    amount: f32,
    start: f32,
    atomsScale: f32,
    debugMode: f32,
    minLimit: vec4<f32>,
    maxLimit: vec4<f32>,
    allowReset: f32,
    getCellNeighbors: f32,
    kSmoothminScale: f32,
    octreeCreationMargins: f32,
}
@binding(0) @group(2) var<uniform> drawSettings : DrawSettings;

struct Output {
    @builtin(position) position : vec4<f32>,
    @location(0) vPos : vec4<f32>,
};

@vertex
fn vs_main(@location(0) pos: vec4<f32>, @location(1) color: vec4<f32>) -> Output {
    var output: Output;
    output.position = pos;
    output.vPos = pos;
    let mvp = mvpMatrix;
    let invVp = inverseVpMatrix;
    return output;
}

struct SdfResult {
    distance : f32,
    color : vec4<f32>, 
}

struct Hit {
    t: f32,
	intersection: vec3<f32>,
    normal: vec3<f32>,
    atomNumber: f32,
}

const miss: Hit = Hit(1e20, vec3(0.0), vec3(0.0), -1);

//https://iquilezles.org/articles/distfunctions/
fn opSmoothUnion(d1: f32, d2: f32, k: f32) -> f32 {
    let h = clamp(0.5 + 0.5*(d2-d1)/k, 0.0, 1.0);
    return mix(d2, d1, h) - k*h*(1.0-h); 
}

fn opSMinColor(a: f32, b: f32, k: f32) -> vec2<f32> {
    let h: f32 = max(k-abs(a-b), 0.0)/k;
    let m: f32 = h*h*0.5;
    let s: f32 = m*k*(1.0/2.0);
    if (a < b) {
        return vec2(a-s, m);
    } else {
        return vec2(b-s, 1.0-m);
    }
}

fn dSphere(p: vec3<f32>, center: vec3<f32>, radius: f32) -> f32 {
    return length(p-center)-radius;
}

fn covalentRadius(number: f32) -> f32 {
    if (number < 1.1) {
        return 1.0*drawSettings.atomsScale;
    } else if (number < 8.1) {
        //C/N/O
        return 0.68*drawSettings.atomsScale;
    }
    //S sulfur
    return 1.02*drawSettings.atomsScale;
}

fn child(index: i32, number: i32) -> i32 {
    let result = 8*(index+1)+number;
    return result;
}

fn parent(index: i32) -> i32 {
    let result = (index/8)-1;
    return result;
}

var<private> intersecting: i32 = -1;
var<private> previousIntersecting: i32 = -1;
var<private> previouserIntersecting: i32 = -1;
var<private> previousestIntersecting: i32 = -1;
var<private> numRaySphereIntersections: i32 = 0;
var<private> numIntersected: i32 = 0;

var<private> neighborX: i32 = -1;
var<private> neighborY: i32 = -1;
var<private> neighborZ: i32 = -1;

fn dAtomsInBin(p: vec3<f32>, binId: i32) -> SdfResult {
    var atomNumber = -1.0;
    var resDistance = 1000000000.0;
    var resColor: vec4<f32> = vec4(1.0);
    for (var i : i32 = i32(bins.bins[binId].start); i < i32(bins.bins[binId].end); i++) {
        let d = dSphere(p, atoms.atoms[i].position, covalentRadius(atoms.atoms[i].number));
        let smin = opSMinColor(resDistance, d, drawSettings.kSmoothminScale);
        resDistance = smin.x;
        resColor = mix(resColor, getAtomColor(atoms.atoms[i].number), smin.y);
    }
    var result: SdfResult;
    result.distance = resDistance;
    result.color = resColor;
    return result;
} 

//todo split into function that just returns d and sdfresult that is called only in final, might speed stuff up
fn dAtoms(p: vec3<f32>) -> SdfResult {
    let start = i32(drawSettings.start);
    let amount = arrayLength(&atoms.atoms);
    let binsAmount =  arrayLength(&bins.bins);
    var result: SdfResult = dAtomsInBin(p, intersecting);
    if (neighborX != -1) {
        let neighborResult: SdfResult = dAtomsInBin(p, neighborX);
        let smoothD = opSmoothUnion(result.distance, neighborResult.distance, drawSettings.kSmoothminScale);
        if (neighborResult.distance < result.distance) {
            result = neighborResult;
        }
        result.distance = smoothD;
    }
    if (neighborY != -1) {
        let neighborResult: SdfResult = dAtomsInBin(p, neighborY);
        let smoothD = opSmoothUnion(result.distance, neighborResult.distance, drawSettings.kSmoothminScale);
        if (neighborResult.distance < result.distance) {
            result = neighborResult;
        }
        result.distance = smoothD;
    }
    if (neighborZ != -1) {
        let neighborResult: SdfResult = dAtomsInBin(p, neighborZ);
        let smoothD = opSmoothUnion(result.distance, neighborResult.distance, drawSettings.kSmoothminScale);
        if (neighborResult.distance < result.distance) {
            result = neighborResult;
        }
        result.distance = smoothD;
    }
    return result;
}

fn dScene(p: vec3<f32>) -> SdfResult {
    let sdfResult = dAtoms(p);
    return sdfResult;
}

fn getAtomColor(atomNumber: f32) -> vec4<f32> {
    if (atomNumber < 0) {
        return vec4(0.0, 10.0, 0.0, 1.0);
    } else if (atomNumber < 6.5) {
        return vec4(0.3, 0.8, 0.3, 1.0); // C
    } else if (atomNumber < 7.5) {
        return vec4(0.25, 0.05, 0.85, 1.0); // N
    } else if (atomNumber < 8.5) {
        return vec4(0.85, 0.05, 0.05, 1.0); // O
    } else if (atomNumber < 16.5) {
        return vec4(0.975, 0.975, 0.025, 1.0); // S
    }
    return vec4(1.0, 1.0, 1.0, 1.0);
}

fn findNormal(pos: vec3<f32>) -> vec3<f32> {
    var n = vec3(0.0);
    for (var i = 0; i < 4; i++) {
        let e = (vec3(f32(((i+3)>>1)&1), f32((i>>1)&1), f32(i&1))*2.0-1.0)*0.5773;
        n += e*dScene(pos+e*0.001*1.0).distance;
    }
    return normalize(n);
}

//modified from https://tavianator.com/2022/ray_box_boundary.html
fn aabbIntersection(origin: vec3<f32>, direction: vec3<f32>, directionInverse: vec3<f32>, boxMin: vec3<f32>, boxMax: vec3<f32>) -> vec2<f32> {
    var tmin: f32 = -100.0;
    var tmax: f32 = 6942069.0;

    for (var i = 0; i < 3; i++) {
        let t1 = (boxMin[i] - origin[i]) * directionInverse[i];
        let t2 = (boxMax[i] - origin[i]) * directionInverse[i];

        tmin = max(tmin, min(t1, t2));
        tmax = min(tmax, max(t1, t2));
    }
    return vec2(tmin, tmax);
}

//tddo try find faster version?
fn raySphereIntersection(origin: vec3<f32>, direction: vec3<f32>, atom: Atom) -> Hit {
    let center = atom.position;
    let radius = covalentRadius(atom.number)+drawSettings.kSmoothminScale*0.51;
	let oc = origin - center;
	let b = dot(direction, oc);
	let c = dot(oc, oc) - (radius*radius);

	let det = b*b - c;
	if (det < 0.0) {return miss;}

	let t = -b - sqrt(det);
	//if (t < 0.0) {t = -b + sqrt(det);}
	if (t < 0.0) {return miss;}

	let intersection = origin + t * direction;
	let normal = normalize(intersection - center);
    return Hit(t, intersection, normal, atom.number);
}

fn getChildCellFromLimits(point: vec3<f32>) -> i32 {
    let center: vec3<f32> = drawSettings.minLimit.xyz+(drawSettings.maxLimit.xyz-drawSettings.minLimit.xyz)/2;
    var childId: i32 = 0;
    if (point.x > center.x) {
        childId += 1;
    }
    if (point.y > center.y) {
        childId += 2;
    }
    if (point.z > center.z) {
        childId += 4;
    }
    return childId;
}

fn getChildCellFromBin(point: vec3<f32>, binId: i32) -> i32 {
    let center: vec3<f32> = bins.bins[binId].min+(bins.bins[binId].max-bins.bins[binId].min)/2;
    var childId: i32 = 0;
    if (point.x > center.x) {
        childId += 1;
    }
    if (point.y > center.y) {
        childId += 2;
    }
    if (point.z > center.z) {
        childId += 4;
    }
    return child(binId, childId);
}

fn findCellInOctreeForPoint(point: vec3<f32>) -> i32 {
    if ((point.x <= drawSettings.minLimit.x || point.y <= drawSettings.minLimit.y || point.y <= drawSettings.minLimit.z) 
    || (point.x >= drawSettings.maxLimit.x || point.y >= drawSettings.maxLimit.y || point.z >= drawSettings.maxLimit.z)) {
        return -1;
    }
    let binsAmount = i32(arrayLength(&bins.bins));
    let size: vec3<f32> = drawSettings.maxLimit.xyz-drawSettings.minLimit.xyz;
    var bin: i32 = getChildCellFromLimits(point);
    while (child(bin, 0) < binsAmount) {
        bin = getChildCellFromBin(point, bin);
    }
    return bin;
}

fn findNeighboringCells(point: vec3<f32>, binId: i32) {
    let size: vec3<f32> = bins.bins[binId].max-bins.bins[binId].min;
    if (point.x < bins.bins[binId].min.x+size.x/4) {
        neighborX = findCellInOctreeForPoint(point-vec3(size.x, 0.0, 0.0));
    } else if (point.x > bins.bins[binId].min.x+3*size.x/4) {
        neighborX = findCellInOctreeForPoint(point+vec3(size.x, 0.0, 0.0));
    }
    if (point.y < bins.bins[binId].min.y+size.y/4) {
        neighborY = findCellInOctreeForPoint(point-vec3(0.0, size.y, 0.0));
    } else if (point.y > bins.bins[binId].min.y+3*size.y/4) {
        neighborY = findCellInOctreeForPoint(point+vec3(0.0, size.y, 0.0));
    }
    if (point.z < bins.bins[binId].min.z+size.z/4) {
        neighborZ = findCellInOctreeForPoint(point-vec3(0.0, 0.0, size.z));
    } else if (point.z > bins.bins[binId].min.z+3*size.z/4) {
        neighborZ = findCellInOctreeForPoint(point+vec3(0.0, 0.0, size.z));
    }
}

var<private> start: vec3<f32>;
var<private> end: f32;

//todo: return multiple closest cells too and raymarch along them, otherwise at bigger atom sizes we die 
//todo: try messing with this more
//todo: start xyz order in way according  https://bertolami.com/files/octrees.pdf
fn findIntersectingCells(origin: vec3<f32>, direction: vec3<f32>) -> vec3<f32> {
    var closestAABBintersection: vec3<f32> = vec3(-1.0);
    var closestHit: Hit = miss;
    let binsAmount = arrayLength(&bins.bins);
    let inverseDirection = 1.0/direction;
    let lastIntersecting = previousestIntersecting;
    previousestIntersecting = previouserIntersecting;
    previouserIntersecting = previousIntersecting;
    previousIntersecting = intersecting;
    intersecting = -1;

    for (var i : i32 = 0; i < 8; i++) {
        var firstId = i;
        if (direction.z < 0) {
            firstId = 7-i;
        }
        let intersection = aabbIntersection(origin, direction, inverseDirection, bins.bins[firstId].min, bins.bins[firstId].max);
        if (intersection.x < intersection.y && intersection.x > -15.0 && intersection.x <= closestHit.t) {
            numIntersected++;
            for (var m : i32 = child(firstId, 0); m < child(firstId, 8); m++) {
                let intersection2 = aabbIntersection(origin, direction, inverseDirection, bins.bins[m].min, bins.bins[m].max);
                if (intersection2.x < intersection2.y && intersection2.x > -5.0 && intersection2.x <= closestHit.t) {
                    numIntersected++;
                    for (var n : i32 = child(m, 0); n < child(m, 8); n++) {
                        let intersection3 = aabbIntersection(origin, direction, inverseDirection, bins.bins[n].min, bins.bins[n].max);
                        if (intersection3.x < intersection3.y && intersection3.x > -5.0 && intersection3.x <= closestHit.t) {
                            numIntersected++;
                            for (var j : i32 = child(n, 0); j < child(n, 8); j++) {
                                if (j == lastIntersecting || j == previousIntersecting || j == previouserIntersecting || j == previousestIntersecting) {
                                    continue;
                                }
                                let intersectionFinal = aabbIntersection(origin, direction, inverseDirection, bins.bins[j].min, bins.bins[j].max);
                                if (intersectionFinal.x < intersectionFinal.y && intersectionFinal.x > -0.25 && intersectionFinal.x <= closestHit.t) {
                                    numIntersected++;
                                    for (var a: i32 = i32(bins.bins[j].start); a < i32(bins.bins[j].end); a++) {
                                        let hit: Hit = raySphereIntersection(origin, direction, atoms.atoms[a]);
                                        numRaySphereIntersections++;
                                        if (hit.t < closestHit.t) {
                                            closestHit = hit;
                                            intersecting = j;
                                            //closestAABBintersection = start+direction*mix(intersectionFinal.x-5, intersectionFinal.y+5, drawSettings.start);
                                            closestAABBintersection = start+direction*mix(intersectionFinal.x, intersectionFinal.y, drawSettings.start);
                                            end = 2+intersectionFinal.y-intersectionFinal.x;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    if (drawSettings.getCellNeighbors > 0.5) { 
        findNeighboringCells(closestHit.intersection, intersecting);
    }
    start = closestHit.intersection;
    return closestAABBintersection;
}

@fragment
fn fs_main(@builtin(position) position: vec4<f32>, @location(0) vPos: vec4<f32>) -> @location(0) vec4<f32> {
    let screenPos = vPos;

    // ray direction in normalized device coordinate
    let ndcRay = vec4(screenPos.xy, 1.0, 1.0);

    // convert ray direction from normalized device coordinate to world coordinate
    let rayDirection: vec3<f32> = normalize((inverseVpMatrix * ndcRay).xyz);
    //let rayDirection : vec3<f32> = ndcRay.xyz;
    start = cameraPos.xyz; 
    
    let margin = max(drawSettings.atomsScale, drawSettings.kSmoothminScale);
    let limitsSize = drawSettings.maxLimit.xyz-drawSettings.minLimit.xyz;
    let limitsMax = max(max(limitsSize.x, limitsSize.y), limitsSize.z);
    let boundaryIntersection : vec2<f32> = aabbIntersection(start, rayDirection, 1.0/rayDirection, drawSettings.minLimit.xyz, drawSettings.maxLimit.xyz);
    if (boundaryIntersection.x < boundaryIntersection.y && boundaryIntersection.x > -30) {
        if (boundaryIntersection.x > 0) {
            start = start+rayDirection*boundaryIntersection.x;
        }
    } else if (boundaryIntersection.x >= boundaryIntersection.y) {
        return vec4(0.15, 0.0, 0.15, 1.0);
    }

    var closestAABB = findIntersectingCells(start, rayDirection);
    if (intersecting == -1) {
        if (drawSettings.debugMode == 2) {
            //octree intersections
            return colormap_haze(f32(numRaySphereIntersections)/250.0);
        }
        return vec4(0.15, 0.0, 0.15, 1.0);
    }
    //start = start+rayDirection*(closestAABB.x-10.0);

    var t : f32 = 0.0;
    var pos : vec3<f32> = vec3(0.0);
    var iteration = 0;
    var resultColor = vec4(0.0, 0.0, 0.0, 1.0);
    var maxDistance: f32 = -1.0;
	for (iteration = 0; iteration < 100; iteration++) {
		if (t > end+2*drawSettings.atomsScale+drawSettings.kSmoothminScale) {
            if (drawSettings.allowReset > 0.5) {
                t = 0.0;
                start = start+rayDirection*(0.1);
                //start = closestAABB;
                closestAABB = findIntersectingCells(start, rayDirection);
                if (intersecting == -1) {
                    if (drawSettings.debugMode == 2) {
                        //octree intersections
                        return colormap_haze(f32(numRaySphereIntersections)/250.0);
                    }
                    return vec4(0.15, 0.0, 0.15, 1.0);
                }
            } else {
                resultColor = vec4(0.0, 0.0, 0.0, 1.0);
                break;
            }
		}
        pos = start+t*rayDirection;
        if (distance(pos, cameraPos.xyz) > maxDistance) { maxDistance = distance(pos, cameraPos.xyz); }
		let sdfResult = dScene(pos);
        
		if (sdfResult.distance < 0.05) {
            resultColor = vec4(-0.25, 0.05, 0.25, 1.0)+sdfResult.color/2;
            break;
		}
		t = t+sdfResult.distance;
	}
    if (iteration == 100) {
        resultColor = vec4(0.05, 0.05, 0.95, 1.0);
    }

    let center = drawSettings.minLimit.xyz+limitsSize/2;
    let sphereInitStart = normalize(center-cameraPos.xyz)*limitsMax;
    let cameraDistance = distance(sphereInitStart, pos);
    if (drawSettings.debugMode == 0) {
        //default
        return resultColor*(pow(cameraDistance/(limitsMax*1.2), 2.0));
    } else if (drawSettings.debugMode == 1) {
        //iterations
        //return vec4(max(f32(iteration)/20.0, 1)-max((f32(iteration)-20.0)/80.0, 0), f32(iteration)/40.0, f32(iteration)/80.0, 1.0);
        return colormap_hotmetal(f32(iteration)/25.0);
    } else if (drawSettings.debugMode == 2) {
        //octree intersections
        //return vec4(max(f32(numRaySphereIntersections)/50.0, 1)-max((f32(numRaySphereIntersections)-50.0)/350.0, 0), f32(numRaySphereIntersections)/150.0, f32(numRaySphereIntersections)/300.0, 1.0);
        return colormap_haze(f32(numRaySphereIntersections)/250.0);
    } else if (drawSettings.debugMode == 3) {
        //octree intersections 2
        return vec4(max(f32(iteration)/10.0, 1)-max((f32(iteration)-10.0)/60.0, 0), f32(numIntersected)/25.0, f32(numIntersected)/35.0, 1.0);
    } else if (drawSettings.debugMode == 4) {
        //depth
        return colormap_eosb(maxDistance/100.0);
    } else if (drawSettings.debugMode == 5) {
        //normals
        return vec4(findNormal(pos), 1.0);
    } else if (drawSettings.debugMode == 6) {
        //default bright
        return (vec4(abs(0.5-resultColor.x), abs(0.5-resultColor.y), abs(0.5-resultColor.z), 1.0))*(pow(cameraDistance/(limitsMax*1.2), 2.0));
    } else if (drawSettings.debugMode == 7) {
        //default lit
        let n: vec3<f32> = findNormal(pos);
        let l1: vec3<f32> = normalize(vec3(0.5, 1, 0.25));
        let l2: vec3<f32> = normalize(vec3(-0.5, 1, 0.25));
        var c = max(dot(n, l1), 0)*vec3(0.75, 0.5, 0.5)*resultColor.xyz + max(dot(n, l2), 0)*vec3(0.5, 0.5, 0.75)*resultColor.xyz;
        return vec4(c, 1.0)*(pow(cameraDistance/(limitsMax*1.2), 2.0));
    } else if (drawSettings.debugMode == 8) {
        //default gooch
        let n: vec3<f32> = findNormal(pos);
        let l1: vec3<f32> = normalize(vec3(0.5, 1, 0.25));
        let ndotl: f32 = dot(n, l1);
        var c = mix(vec3(0.65, 0.05, 0.65), vec3(0.9, 0.9, 0.05), ndotl*2+1)*resultColor.xyz;
        return vec4(c, 1.0)*(pow(cameraDistance/(limitsMax*1.2), 2.0));
    }
    return resultColor;
    //return vec4(max(f32(numRaySphereIntersections)/50.0, 1)-f32(numRaySphereIntersections)/400.0, f32(numRaySphereIntersections)/150.0, f32(numRaySphereIntersections)/300.0, 1.0);
    //return resultColor+vec4(f32(iteration)/40.0, f32(numRaySphereIntersections)/100.0, f32(numIntersected)/48.0, 0.0);
    //return resultColor+vec4(0.0, f32(numIntersected)/200.0, 0.0, 0.0);
    //return resultColor;
}

//utilities.wgsl inserted here