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
    debugA: f32,
    debugB: f32,
    atomsScale: f32,
    debugMode: f32,
    minLimit: vec4<f32>,
    maxLimit: vec4<f32>,
    allowReset: f32,
    getCellNeighbors: f32,
    kSmoothminScale: f32,
    octreeCreationMargins: f32,
    totalAtoms: f32,
    treeLayers: f32,
    padding1: f32,
    padding2: f32,
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

fn covalentRadius(w: f32) -> f32 {
    let number = w%100.0;
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

fn dAtomsInBin(p: vec3<f32>, binId: i32) -> f32 {
    var atomNumber = -1.0;
    var resDistance = 1000000000.0;
    for (var i : i32 = i32(bins.bins[binId].start); i < i32(bins.bins[binId].end); i++) {
        let d = dSphere(p, atoms.atoms[i].position, covalentRadius(atoms.atoms[i].number));
        resDistance = opSmoothUnion(resDistance, d, drawSettings.kSmoothminScale);
    }
    return resDistance;
}

fn dAtomsInBinColor(p: vec3<f32>, binId: i32) -> SdfResult {
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

fn dAtoms(p: vec3<f32>) -> f32 {
    //let amount = arrayLength(&atoms.atoms);
    //let binsAmount =  arrayLength(&bins.bins);
    //var result: SdfResult = dAtomsInBin(p, intersecting);
    /*if (neighborX != -1) {
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
    }*/
    return dAtomsInBin(p, intersecting);
}

fn dAtomsColor(p: vec3<f32>) -> SdfResult {
    var result: SdfResult = dAtomsInBinColor(p, intersecting);
    return result;
}

fn getAtomColor(w: f32) -> vec4<f32> {
    let atomNumber = w%100.0;
    let aminoAtomType = w/100;
    var color = vec4(10.0, 10.0, 10.0, 1.0);
    if (atomNumber < 6.5) {
        color = vec4(0.6, 0.9, 0.3, 1.0); // C
    } else if (atomNumber < 7.5) {
        color = vec4(0.95, 0.05, 0.25, 1.0); // N
    } else if (atomNumber < 8.5) {
        color = vec4(0.20, 0.05, 0.95, 1.0); // O
    } else if (atomNumber < 16.5) {
        color = vec4(0.995, 0.995, 0.025, 1.0); // S
    }
    if (aminoAtomType > 1) {
        color = color/5+vec4(0.85, 0.85, 0.85, 0);
    } else {
        color = color/1.275;
    }
    return color;
}

fn findNormal(pos: vec3<f32>) -> vec3<f32> {
    var n = vec3(0.0);
    for (var i = 0; i < 4; i++) {
        let e = (vec3(f32(((i+3)>>1)&1), f32((i>>1)&1), f32(i&1))*2.0-1.0)*0.5773;
        n += e*dAtoms(pos+e*0.001*1.0);
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
fn raySphereIntersection(origin: vec3<f32>, direction: vec3<f32>, atom: Atom, addSmoothMinMargin: f32) -> Hit {
    let center = atom.position;
    let radius = covalentRadius(atom.number)+drawSettings.kSmoothminScale*addSmoothMinMargin*0.51;
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

var<private> start: vec3<f32>;
var<private> end: f32;
const stackSize = 32;
var<private> stackT: array<f32, stackSize>;
var<private> stackBins: array<i32, stackSize>;

fn resetStack() {
    for (var i : i32 = 0; i < stackSize; i++) {
        stackT[i] = 10000000.0;
        stackBins[i] = -1;
    }
}

fn insertIntoSortedStack(t: f32, bin: i32) {
    for (var i : i32 = 0; i < stackSize; i++) {
        if (stackT[i] > t) {
            for (var j : i32 = stackSize-1; j >= i+1; j--) {
                stackT[j] = stackT[j-1];
                stackBins[j] = stackBins[j-1];
            }
            stackT[i] = t;
            stackBins[i] = bin;
            break;
        }
    }
}

const MAP_INDEXES_0 = array(0,1,2,4,5,3,6,7);
const MAP_INDEXES_1 = array(1,0,5,3,2,7,4,6);
const MAP_INDEXES_2 = array(2,0,3,6,7,1,4,5);
const MAP_INDEXES_3 = array(3,2,7,1,6,0,5,4);
const MAP_INDEXES_4 = array(4,0,5,6,1,2,7,3);
const MAP_INDEXES_5 = array(5,7,4,1,3,6,0,2);
const MAP_INDEXES_6 = array(6,7,2,4,0,5,3,1);
const MAP_INDEXES_7 = array(7,3,6,5,1,2,4,0);
//todo make this efficient not just if in corners but also when at centers of sides
fn getFirstIndexUsingOrigin(origin: vec3<f32>, i: i32) -> i32 {
    if (origin.x < 0 && origin.y < 0 && origin.z < 0) {
        return MAP_INDEXES_0[i];
    } else if (origin.x > 0 && origin.y < 0 && origin.z < 0) {
        return MAP_INDEXES_1[i];
    } else if (origin.x < 0 && origin.y > 0 && origin.z < 0) {
        return MAP_INDEXES_2[i];
    } else if (origin.x > 0 && origin.y > 0 && origin.z < 0) {
        return MAP_INDEXES_3[i];
    } else if (origin.x < 0 && origin.y < 0 && origin.z > 0) {
        return MAP_INDEXES_4[i];
    } else if (origin.x > 0 && origin.y < 0 && origin.z > 0) {
        return MAP_INDEXES_5[i];
    } else if (origin.x < 0 && origin.y > 0 && origin.z > 0) {
        return MAP_INDEXES_6[i];
    } else { //if (origin.x < 0 && origin.y < 0 && origin.z < 0) {
        return MAP_INDEXES_7[i];
    }
}


fn findIntersectingCells(origin: vec3<f32>, direction: vec3<f32>) -> vec3<f32> {
    var closestAABBintersection: vec3<f32> = vec3(-1.0);
    let binsAmount = arrayLength(&bins.bins);
    let inverseDirection = 1.0/direction;
    resetStack();

    for (var i : i32 = 0; i < 8; i++) {
        var firstId = getFirstIndexUsingOrigin(origin, i);
        let intersection = aabbIntersection(origin, direction, inverseDirection, bins.bins[firstId].min, bins.bins[firstId].max);
        if (intersection.x < intersection.y && intersection.x > -15.0 && bins.bins[firstId].end < -1.5 && intersection.x < closestRealHitT) {
            numIntersected += 8;
            for (var mi : i32 = 0; mi < 8; mi++) {
                let m = child(firstId, getFirstIndexUsingOrigin(origin, mi));
                let intersection2 = aabbIntersection(origin, direction, inverseDirection, bins.bins[m].min, bins.bins[m].max);
                if (intersection2.x < intersection2.y && intersection2.x > -10.0 && bins.bins[m].end < -1.5 && intersection2.x < closestRealHitT) {
                    numIntersected += 3;
                    for (var n : i32 = child(m, 0); n < child(m, 8); n++) {
                        let intersection3 = aabbIntersection(origin, direction, inverseDirection, bins.bins[n].min, bins.bins[n].max);
                        if (intersection3.x < intersection3.y && intersection3.x > -5.0 && bins.bins[n].end < -1.5 && intersection3.x < closestRealHitT) {
                            numIntersected += 2;
                            for (var j : i32 = child(n, 0); j < child(n, 8); j++) {
                                let intersectionFinal = aabbIntersection(origin, direction, inverseDirection, bins.bins[j].min, bins.bins[j].max);
                                if (intersectionFinal.x < intersectionFinal.y && intersectionFinal.x > -0.25 && intersectionFinal.x < closestRealHitT) {
                                    numIntersected++;
                                    var closestT: f32 = miss.t;
                                    for (var a: i32 = i32(bins.bins[j].start); a < i32(bins.bins[j].end); a++) {
                                        let hit: Hit = raySphereIntersection(origin, direction, atoms.atoms[a], 1);
                                        numRaySphereIntersections++;
                                        if (hit.t > intersectionFinal.y || hit.t < intersectionFinal.x) {
                                            continue;
                                        }
                                        if (hit.t < miss.t) {
                                            let realHit: Hit = raySphereIntersection(origin, direction, atoms.atoms[a], 0);
                                            if (closestRealHitT > realHit.t) {
                                                closestRealHitAtom = a;
                                                closestRealHitT = realHit.t;
                                                if (drawSettings.debugA < 0.15 || drawSettings.debugMode == 13 || drawSettings.debugMode == 14 || drawSettings.debugMode == 15 || drawSettings.debugMode == 16 || drawSettings.debugMode == 19) {
                                                    closestRealHitT = 1000000;
                                                }
                                            }
                                            if (hit.t < closestT) {
                                                closestT = hit.t;
                                            }
                                        }
                                    }
                                    if (closestT != miss.t) {
                                        insertIntoSortedStack(closestT, j);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    intersecting = stackBins[0];
    start = start+direction*stackT[0];
    let binSize = bins.bins[stackBins[0]].max-bins.bins[stackBins[0]].min;
    //let intersectionEnd = aabbIntersection(origin, direction, inverseDirection, bins.bins[stackBins[0]].min, bins.bins[stackBins[0]].max);
    //end = intersectionEnd.y-stackT[0];
    end = min(max(binSize.x, max(binSize.y, binSize.z)), stackT[1]-drawSettings.kSmoothminScale);
    return start;
}

var<private> closestRealHitT = 10000000.0;
var<private> closestRealHitAtom = 1;
const binsStackSize = 40;
var<private> binsStack: array<i32, binsStackSize>;
fn findIntersectingCellsStack(origin: vec3<f32>, direction: vec3<f32>) -> vec3<f32> {
    var closestAABBintersection: vec3<f32> = vec3(-1.0);
    let binsAmount = i32(arrayLength(&bins.bins));
    let inverseDirection = 1.0/direction;
    resetStack();
    var lastLayerStart = 0;
    for (var i : i32 = 1; i < 16; i++) {
        if (lastLayerStart+i32(pow(8.0, f32(i))) >= binsAmount) {
            break;
        }
        lastLayerStart += i32(pow(8.0, f32(i)));
    }

    let currLayer = 0;
    var bv = 0;
    var binsStackNum = 0;
    for (var i : i32 = 0; i < 8; i++) {
        var firstId = getFirstIndexUsingOrigin(origin, i);
        binsStack[binsStackNum] = firstId;
        binsStackNum++;
    }

    while (binsStackNum > 0) {
        numIntersected += 2;
        let curr = binsStack[binsStackNum-1];
        binsStackNum--;
        for (var i : i32 = child(curr, 0); i < child(curr, 8); i++) {
            let intersectionI = aabbIntersection(origin, direction, inverseDirection, bins.bins[i].min, bins.bins[i].max);
            if (intersectionI.x < intersectionI.y && intersectionI.x > -0.25 && intersectionI.x < closestRealHitT && (i > lastLayerStart || bins.bins[i].end < -1.5)) {
                numIntersected++;
                if (i >= lastLayerStart) {
                    var closestT: f32 = miss.t;
                    for (var a: i32 = i32(bins.bins[i].start); a < i32(bins.bins[i].end); a++) {
                        let hit: Hit = raySphereIntersection(origin, direction, atoms.atoms[a], 1);
                        numRaySphereIntersections++;
                        if (hit.t > intersectionI.y || hit.t < intersectionI.x) {
                            continue;
                        }
                        if (hit.t < miss.t) {
                            let realHit: Hit = raySphereIntersection(origin, direction, atoms.atoms[a], 0);
                            if (closestRealHitT > realHit.t) {
                                closestRealHitAtom = a;
                                closestRealHitT = realHit.t;
                                if (drawSettings.debugA < 0.15 || drawSettings.debugMode == 13 || drawSettings.debugMode == 14 || drawSettings.debugMode == 15 || drawSettings.debugMode == 16 || drawSettings.debugMode == 19) {
                                    closestRealHitT = 1000000;
                                }
                            }
                            if (hit.t < closestT) {
                                closestT = hit.t;
                            }
                        }
                    }
                    if (closestT != miss.t) {
                        insertIntoSortedStack(closestT, i);
                    }
                } else {
                    binsStack[binsStackNum] = i;
                    binsStackNum++;
                }
            }
        }
    }

    intersecting = stackBins[0];
    start = start+direction*stackT[0];
    let binSize = bins.bins[stackBins[0]].max-bins.bins[stackBins[0]].min;
    end = min(max(binSize.x, max(binSize.y, binSize.z)), stackT[1]-drawSettings.kSmoothminScale);
    if (drawSettings.debugMode == 24) {
        intersecting = stackBins[1];
        start = start+direction*stackT[1];
        let binSize = bins.bins[stackBins[1]].max-bins.bins[stackBins[1]].min;
        end = min(max(binSize.x, max(binSize.y, binSize.z)), stackT[2]-drawSettings.kSmoothminScale);
    }
    //let intersectionEnd = aabbIntersection(origin, direction, inverseDirection, bins.bins[stackBins[0]].min, bins.bins[stackBins[0]].max);
    //end = intersectionEnd.y-stackT[0];
    return start;
}

const maxIterations = 100;

fn raymarch(initStart: vec3<f32>, rayDirection: vec3<f32>) -> vec4<f32> {
    var maxDistance: f32 = -1.0;
    var raymarchedAtoms: f32 = bins.bins[intersecting].end-bins.bins[intersecting].start;

    var t : f32 = 0.0;
    var pos : vec3<f32> = vec3(0.0);
    var iteration = 0;
    var resultColor = vec4(0.0, 0.0, 0.0, 1.0);
    var stackPos = 0;
	for (iteration = 0; iteration < maxIterations; iteration++) {
		if (t > end+drawSettings.kSmoothminScale) {
            if (drawSettings.allowReset > 0.5) {
                t = 0.0;
                stackPos++;
                if (stackPos == stackSize || stackBins[stackPos] == -1) {
                    if (drawSettings.debugMode == 2) {
                        return debugModeOctree(numRaySphereIntersections, drawSettings.totalAtoms);
                    } else if (drawSettings.debugMode == 3) {
                        return debugModeOctree2(numIntersected, iteration, maxIterations);
                    } else if (drawSettings.debugMode == 10) {
                        return debugModeSteps(stackPos, stackSize);
                    }
                    if (stackPos == stackSize && drawSettings.debugB > 0.5) {
                        return vec4(10.15, 10.0, 0.15, 1.0);
                    }
                    return vec4(0.15, 0.0, 0.15, 1.0);
                }
                start = initStart.xyz+rayDirection*stackT[stackPos];
                //let intersectionEnd = aabbIntersection(start, rayDirection, 1.0/rayDirection, bins.bins[stackPos].min, bins.bins[stackPos].max);
                //end = intersectionEnd.y;
                let binSize = bins.bins[stackBins[stackPos]].max-bins.bins[stackBins[stackPos]].min;
                end = max(binSize.x, max(binSize.y, binSize.z));
                intersecting = stackBins[stackPos];
                raymarchedAtoms += bins.bins[intersecting].end-bins.bins[intersecting].start;
            } else {
                resultColor = vec4(0.0, 0.0, 0.0, 1.0);
                break;
            }
		}
        pos = start+t*rayDirection;
        if (distance(pos, cameraPos.xyz) > maxDistance) { maxDistance = distance(pos, cameraPos.xyz); }
		let d = dAtoms(pos);
        
		if (d < 0.05) {
            //todo check if next stacksteps could be better?
            resultColor = vec4(-0.25, 0.05, 0.25, 1.0)+dAtomsColor(pos).color/2;
            break;
		}
		t = t+d+mix(0, 0.05, drawSettings.debugB);
	}
    if (iteration == maxIterations && drawSettings.debugB > 0.9) {
        resultColor = vec4(10.05, 10.05, 10.95, 1.0);
    } else if (iteration == maxIterations && drawSettings.debugB <= 0.9) {
        let sdfResult = dAtomsColor(pos);
        resultColor = vec4(-0.25, 0.05, 0.25, 1.0)+sdfResult.color/2;
    }

    let limitsSize = drawSettings.maxLimit.xyz-drawSettings.minLimit.xyz;
    let limitsMax = max(max(limitsSize.x, limitsSize.y), limitsSize.z);
    let center = drawSettings.minLimit.xyz+limitsSize/2;
    let sphereInitStart = normalize(center-cameraPos.xyz)*limitsMax;
    let cameraDistance = distance(sphereInitStart, pos);
    let distanceFade = pow(cameraDistance/(limitsMax*1.2), 1.0+drawSettings.debugA*2);
    if (drawSettings.debugMode == 0) {
        //default
        return resultColor*distanceFade;
    } else if (drawSettings.debugMode == 1) {
        return debugModeIterations(iteration, maxIterations);
    } else if (drawSettings.debugMode == 2) {
        return debugModeOctree(numRaySphereIntersections, drawSettings.totalAtoms);
    } else if (drawSettings.debugMode == 3) {
        return debugModeOctree2(numIntersected, iteration, maxIterations);
    } else if (drawSettings.debugMode == 4) {
        return debugModeDepth(maxDistance);
    } else if (drawSettings.debugMode == 5) {
        return debugModeNormals(findNormal(pos));
    } else if (drawSettings.debugMode == 6) {
        return debugModeBright(resultColor, distanceFade);
    } else if (drawSettings.debugMode == 18) {
        return debugModeDefaultWithBase(resultColor, distanceFade, closestRealHitT, getAtomColor(atoms.atoms[closestRealHitAtom].number), distance(initStart, pos));
    } else if (drawSettings.debugMode == 19) {
        return debugModeFakeTransparency(resultColor, distanceFade, distance(initStart, pos), initStart, rayDirection);
    } else if (drawSettings.debugMode == 7) {
        return debugModeSemilit(resultColor, distanceFade, findNormal(pos));
    } else if (drawSettings.debugMode == 8) {
        return debugModeLit(resultColor, distanceFade, findNormal(pos));
    } else if (drawSettings.debugMode == 9) {
        return debugModeGooch(resultColor, distanceFade, findNormal(pos));
    } else if (drawSettings.debugMode == 10) {
        return debugModeSteps(stackPos, stackSize);
    } else if (drawSettings.debugMode == 11) {
        return debugModeRaymarchedAtoms(raymarchedAtoms);
    } else if (drawSettings.debugMode == 12) {
        return debugModeOctree3(numRaySphereIntersections, numIntersected, intersecting);
    } else if (drawSettings.debugMode == 17) {
        return debugModeDebug(numRaySphereIntersections, numIntersected, intersecting, stackPos, resultColor, iteration, closestRealHitT);
    } else if (drawSettings.debugMode == 21) {
        return debugModeHideStackPos(resultColor, stackPos, 0, distanceFade);
    } else if (drawSettings.debugMode == 22) {
        return debugModeHideStackPos(resultColor, stackPos, 1, distanceFade);
    } else if (drawSettings.debugMode == 23) {
        return debugModeHideStackPos(resultColor, stackPos, 2, distanceFade);
    } else if (drawSettings.debugMode == 24) {
        return resultColor*distanceFade; //skip step0
    } else if (drawSettings.debugMode == 25) {
        return debugModeTEnd(t, end);
    }
    return resultColor*distanceFade;
}

fn raymarchTransparent(initStart: vec3<f32>, rayDirection: vec3<f32>) -> vec4<f32> {
    var maxDistance: f32 = -1.0;
    var raymarchedAtoms: f32 = bins.bins[intersecting].end-bins.bins[intersecting].start;

    var t : f32 = 0.0;
    var pos : vec3<f32> = vec3(0.0);
    var iteration = 0;
    let startColor = vec4(-0.25, 0.05, 0.25, 1.0);
    var resultColor = startColor;
    var stackPos = 0;
	for (iteration = 0; iteration < maxIterations*2; iteration++) {
        //todo: make transparent really start where last cell ends
		if (t > end+2*drawSettings.atomsScale+drawSettings.kSmoothminScale) {
            stackPos++;
            if (stackPos == stackSize || stackBins[stackPos] == -1) {
                break;
            }
            start = initStart.xyz+rayDirection*max(stackT[stackPos], t+0.05);
            //let intersectionEnd = aabbIntersection(start, rayDirection, 1.0/rayDirection, bins.bins[stackPos].min, bins.bins[stackPos].max);
            //end = intersectionEnd.y+0.25;
            let binSize = bins.bins[stackBins[stackPos]].max-bins.bins[stackBins[stackPos]].min;
            end = max(binSize.x, max(binSize.y, binSize.z));
            t = 0.0;
            intersecting = stackBins[stackPos];
            raymarchedAtoms += bins.bins[intersecting].end-bins.bins[intersecting].start;
		}
        pos = start+t*rayDirection;
        if (distance(pos, cameraPos.xyz) > maxDistance) { maxDistance = distance(pos, cameraPos.xyz); }
		let d = dAtoms(pos);
        
		if (d < 0.05) {
            if (drawSettings.debugMode == 15) {
                resultColor += vec4(0.01, 0.01, 0.01, 0.0)*mix(0.1, 3, drawSettings.debugA)*mix(1, 0, clamp((d+0.75), 0, 1));
            } else if (drawSettings.debugMode == 14) {
                resultColor += (dAtomsColor(pos).color/50)*mix(0.1, 3, drawSettings.debugA);
            } else if (drawSettings.debugMode == 16) {
                resultColor += vec4(0.005, 0.005, 0.005, 0.0)*mix(0.1, 3, drawSettings.debugA);
            } else {
                resultColor += vec4(0.01, 0.01, 0.01, 0.0)*mix(0.1, 3, drawSettings.debugA);
            }
            if (drawSettings.debugMode == 16) {
                t = t+mix(0.025, 0.15, drawSettings.debugB);
            } else {
                t = t+abs(d)+mix(0, 0.05, drawSettings.debugB);
            }
		} else {
            t = t+abs(d)+mix(0, 0.05, drawSettings.debugB);
        }
	}
    if (distance(resultColor, startColor) < 0.009) {
        return vec4(0.15, 0.0, 0.15, 1.0);
    }
    /*if (iteration == maxIterations && drawSettings.debugB > 0.9) {
        resultColor = vec4(10.05, 10.05, 10.95, 1.0);
    } else if (iteration == maxIterations && drawSettings.debugB <= 0.9) {
        let sdfResult = dAtomsColor(pos);
        resultColor = vec4(-0.25, 0.05, 0.25, 1.0)+sdfResult.color/2;
    }*/

    let limitsSize = drawSettings.maxLimit.xyz-drawSettings.minLimit.xyz;
    let limitsMax = max(max(limitsSize.x, limitsSize.y), limitsSize.z);
    let center = drawSettings.minLimit.xyz+limitsSize/2;
    let sphereInitStart = normalize(center-cameraPos.xyz)*limitsMax;
    let cameraDistance = distance(sphereInitStart, pos);
    let distanceFade = pow(cameraDistance/(limitsMax*1.2), 1.0+drawSettings.debugA*2);
    return resultColor;
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

    let initStart = start;

    var closestAABB: vec3<f32>;
    /*if (drawSettings.treeLayers == 4) {
        closestAABB = findIntersectingCells(start, rayDirection);
    } else*/ {
        closestAABB = findIntersectingCellsStack(start, rayDirection);
    }
    if (drawSettings.debugMode == 12) {
        return debugModeOctree3(numRaySphereIntersections, numIntersected, intersecting);
    }
    if (intersecting == -1) {
        if (drawSettings.debugMode == 2) {
            return debugModeOctree(numRaySphereIntersections, drawSettings.totalAtoms);
        } else if (drawSettings.debugMode == 3) {
            return debugModeOctree2(numIntersected, 0, maxIterations);
        }
        return vec4(0.15, 0.0, 0.15, 1.0);
    }
    //start = start+rayDirection*(closestAABB.x-10.0);

    if (drawSettings.debugMode == 20) {
        return debugModeDepth(end*30);
    }
    if (drawSettings.debugMode == 13 || drawSettings.debugMode == 14 || drawSettings.debugMode == 15 || drawSettings.debugMode == 16) {
        return raymarchTransparent(initStart, rayDirection);
    }
    return raymarch(initStart, rayDirection);
}

//utilities.wgsl inserted here