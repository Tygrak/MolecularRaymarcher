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
    pad2: f32,
    minLimit: vec4<f32>,
    maxLimit: vec4<f32>,
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
var<private> numRaySphereIntersections: i32 = 0;
var<private> numIntersected: i32 = 0;

var<private> neighborX: i32 = -1;
var<private> neighborY: i32 = -1;
var<private> neighborZ: i32 = -1;

const smoothK: f32 = 0.8;

fn dAtomsInBin(p: vec3<f32>, binId: i32) -> SdfResult {
    var atomNumber = -1.0;
    var resDistance = 1000000000.0;
    var resColor: vec4<f32> = vec4(1.0);
    for (var i : i32 = i32(bins.bins[binId].start); i < i32(bins.bins[binId].end); i++) {
        let d = dSphere(p, atoms.atoms[i].position, covalentRadius(atoms.atoms[i].number));
        let smin = opSMinColor(resDistance, d, smoothK);
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
        let smoothD = opSmoothUnion(result.distance, neighborResult.distance, smoothK);
        if (neighborResult.distance < result.distance) {
            result = neighborResult;
        }
        result.distance = smoothD;
    }
    if (neighborY != -1) {
        let neighborResult: SdfResult = dAtomsInBin(p, neighborY);
        let smoothD = opSmoothUnion(result.distance, neighborResult.distance, smoothK);
        if (neighborResult.distance < result.distance) {
            result = neighborResult;
        }
        result.distance = smoothD;
    }
    if (neighborZ != -1) {
        let neighborResult: SdfResult = dAtomsInBin(p, neighborZ);
        let smoothD = opSmoothUnion(result.distance, neighborResult.distance, smoothK);
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

//modified from https://tavianator.com/2022/ray_box_boundary.html
fn aabbIntersection(origin: vec3<f32>, direction: vec3<f32>, directionInverse: vec3<f32>, boxMin: vec3<f32>, boxMax: vec3<f32>) -> vec2<f32> {
    let margin = max(drawSettings.atomsScale, smoothK);
    var tmin: f32 = -100.0;
    var tmax: f32 = 6942069.0;

    for (var i = 0; i < 3; i++) {
        let t1 = (boxMin[i] - 1.05*margin - origin[i]) * directionInverse[i];
        let t2 = (boxMax[i] + 1.05*margin - origin[i]) * directionInverse[i];

        tmin = max(tmin, min(t1, t2));
        tmax = min(tmax, max(t1, t2));
    }
    return vec2(tmin, tmax);
}

//tddo try find faster version?
fn raySphereIntersection(origin: vec3<f32>, direction: vec3<f32>, atom: Atom) -> Hit {
    let center = atom.position;
    let radius = covalentRadius(atom.number)+smoothK*0.51;
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
    if (point.x < bins.bins[binId].min.x+size.x/2) {
        neighborX = findCellInOctreeForPoint(point-vec3(size.x, 0.0, 0.0));
    } else if (point.x > bins.bins[binId].min.x+size.x/2) {
        neighborX = findCellInOctreeForPoint(point+vec3(size.x, 0.0, 0.0));
    }
    if (point.y < bins.bins[binId].min.y+size.y/2) {
        neighborY = findCellInOctreeForPoint(point-vec3(0.0, size.y, 0.0));
    } else if (point.y > bins.bins[binId].min.y+size.y/2) {
        neighborY = findCellInOctreeForPoint(point+vec3(0.0, size.y, 0.0));
    }
    if (point.z < bins.bins[binId].min.z+size.z/2) {
        neighborZ = findCellInOctreeForPoint(point-vec3(0.0, 0.0, size.z));
    } else if (point.z > bins.bins[binId].min.z+size.z/2) {
        neighborZ = findCellInOctreeForPoint(point+vec3(0.0, 0.0, size.z));
    }
}

var<private> start: vec3<f32>;

//todo: return multiple closest cells too and raymarch along them, otherwise at bigger atom sizes we die 
//todo: try messing with this more
//todo: start xyz order in way according  https://bertolami.com/files/octrees.pdf
fn findIntersectingCells(origin: vec3<f32>, direction: vec3<f32>) -> vec2<f32> {
    var closestAABBintersection: vec2<f32> = vec2(100000000.0, 100000000.0);
    var closestHit: Hit = miss;
    let binsAmount = arrayLength(&bins.bins);
    let inverseDirection = 1.0/direction;

    for (var i : i32 = 0; i < 8; i++) {
        let intersection = aabbIntersection(origin, direction, inverseDirection, bins.bins[i].min, bins.bins[i].max);
        if (intersection.x < intersection.y && intersection.x > -10.0) {
            numIntersected++;
            for (var m : i32 = child(i, 0); m < child(i, 8); m++) {
                let intersection2 = aabbIntersection(origin, direction, inverseDirection, bins.bins[m].min, bins.bins[m].max);
                if (intersection2.x < intersection2.y && intersection2.x > -5.0) {
                    numIntersected++;
                    for (var j : i32 = child(m, 0); j < child(m, 8); j++) {
                        if (j == intersecting || j == neighborX || j == neighborY || j == neighborZ) {
                            continue;
                        }
                        let intersectionFinal = aabbIntersection(origin, direction, inverseDirection, bins.bins[j].min, bins.bins[j].max);
                        if (intersectionFinal.x < intersectionFinal.y && intersectionFinal.x > -5.0) {// && intersectionFinal.x <= closestHit.t) {
                            numIntersected++;
                            for (var a: i32 = i32(bins.bins[j].start); a < i32(bins.bins[j].end); a++) {
                                let hit: Hit = raySphereIntersection(origin, direction, atoms.atoms[a]);
                                numRaySphereIntersections++;
                                if (hit.t < closestHit.t) {
                                    closestHit = hit;
                                    intersecting = j;
                                    closestAABBintersection = intersectionFinal;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    //findNeighboringCells(closestHit.intersection, intersecting);
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
        return vec4(0.15, 0.0, 0.15, 1.0);
    }
    //start = start+rayDirection*(closestAABB.x-10.0);

    var t : f32 = 0.0;
    var pos : vec3<f32> = vec3(0.0);
    var iteration = 0;
    var resultColor = vec4(0.0, 0.0, 0.0, 1.0);
	for (iteration = 0; iteration < 100; iteration++) {
		if (t > limitsMax+drawSettings.atomsScale*2) {
            resultColor = vec4(0.0, 0.0, 0.0, 1.0);
            break;
            //t = 0.0;
            //start = start+rayDirection*(closestAABB.y+4.5);
            //closestAABB = findIntersectingCells(start, rayDirection);
		}
        pos = start+t*rayDirection;
		let sdfResult = dScene(pos);
        
		if (sdfResult.distance < 0.05) {
            resultColor = vec4(-0.25, 0.05, 0.25, 1.0)+sdfResult.color/3;
            break;
		}
		t = t+sdfResult.distance;
	}
    if (iteration == 100) {
        resultColor = vec4(-0.25, 0.4, 50.25, 1.0);
    }

    let cameraDistance = distance(cameraPos.xyz, pos);
    //return resultColor+vec4(f32(iteration)/40.0, f32(numRaySphereIntersections)/100.0, f32(numIntersected)/48.0, 0.0);
    //return resultColor+vec4(0.0, f32(numIntersected)/200.0, 0.0, 0.0);
    return resultColor*(1-pow(t/limitsMax, 2));
    //return resultColor;
}