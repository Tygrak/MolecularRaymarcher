@binding(0) @group(0) var<uniform> mvpMatrix : mat4x4<f32>;
@binding(1) @group(0) var<uniform> inverseVpMatrix : mat4x4<f32>;
@binding(2) @group(0) var<uniform> cameraPos : vec4<f32>;

struct Atom {
    position: vec3<f32>,
    number: f32, //todo: make atom number also contain info about which chain the atom is part of
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
    isFullRender: f32,
    lightDirectionX: f32,
    lightDirectionY: f32,
    lightDirectionZ: f32,
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
    t2: f32,
    atomNumber: f32,
}

const miss: Hit = Hit(1e20, vec3(0.0), 1e20, -1);

//https://iquilezles.org/articles/distfunctions/
//exponential smooth min
//#if UseSmoothMinExp
/*
fn opSMin(d1: f32, d2: f32, k: f32) -> f32 {
    let res = exp2(-(2.0/k)*d1) + exp2(-(2.0/k)*d2);
    return -log2(res)/(2.0/k);
}
*/
//#endif UseSmoothMinExp

//power smooth min
//#if UseSmoothMinPower
/*
fn opSMin(d1: f32, d2: f32, k: f32) -> f32 {
    let a = pow(d1, (1.0/(k+0.5))); 
    let b = pow(d2, (1.0/(k+0.5)));
    return pow((a*b)/(a+b), 1.0/(1.0/(k+0.5)));
}
*/
//#endif UseSmoothMinPower

//root smooth min
//#if UseSmoothMinRoot
/*
fn opSMin(d1: f32, d2: f32, k: f32) -> f32 {
    let h = d1-d2;
    return 0.5*((d1+d2) - sqrt(h*h+k*0.1));
}
*/
//#endif UseSmoothMinRoot

//#if UseSmoothMinPoly1
/*
//polynomial smooth min 1
fn opSMin(d1: f32, d2: f32, k: f32) -> f32 {
    let h = clamp(0.5 + 0.5*(d2-d1)/k, 0.0, 1.0);
    return mix(d2, d1, h) - k*h*(1.0-h); 
}
*/
//#endif UseSmoothMinPoly1

//polynomial smooth min 2
//supposed to be a bit faster -- try more tests, it seems pretty much the same
//#if UseSmoothMinPoly2
fn opSMin(d1: f32, d2: f32, k: f32) -> f32 {
    let h = max(k-abs(d1-d2), 0.0)/k;
    return min(d1, d2) - h*h*k*(1.0/4.0);
}
//#endif UseSmoothMinPoly2


//todo: create alternative versions of this function for other smooth minimums too?
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
        resDistance = opSMin(resDistance, d, drawSettings.kSmoothminScale);
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
        
        //#if DontUseSmoothColorBlending
        if (resDistance > smin.x) {
            resColor = getAtomColor(atoms.atoms[i].number);
        }
        //#endif DontUseSmoothColorBlending
        resDistance = smin.x;
        //#ifnot DontUseSmoothColorBlending
        resColor = mix(resColor, getAtomColor(atoms.atoms[i].number), smin.y);
        //#endifnot DontUseSmoothColorBlending
    }
    var result: SdfResult;
    result.distance = resDistance;
    result.color = resColor;
    return result;
}

fn dAtoms(p: vec3<f32>) -> f32 {
    var resDistance = dAtomsInBin(p, intersecting);
    //#if CreateSliceX
	resDistance = max(p.x+mix(drawSettings.minLimit.x-6, drawSettings.maxLimit.x+6, drawSettings.debugA), resDistance);
    //#endif CreateSliceX
    //#if CreateSliceY
	resDistance = max(p.y+mix(drawSettings.minLimit.y-6, drawSettings.maxLimit.y+6, drawSettings.debugA), resDistance);
    //#endif CreateSliceY
    //#if CreateSliceZ
	resDistance = max(p.z+mix(drawSettings.minLimit.z-6, drawSettings.maxLimit.z+6, drawSettings.debugA), resDistance);
    //#endif CreateSliceZ
    //#if CreateSlabX
	resDistance = max(abs(p.x-mix(drawSettings.minLimit.x-6, drawSettings.maxLimit.x+6, drawSettings.debugA))-7, resDistance);
    //#endif CreateSlabX
    //#if CreateSlabY
	resDistance = max(abs(p.y-mix(drawSettings.minLimit.y-6, drawSettings.maxLimit.y+6, drawSettings.debugA))-7, resDistance);
    //#endif CreateSlabY
    //#if CreateSlabZ
	resDistance = max(abs(p.z-mix(drawSettings.minLimit.z-6, drawSettings.maxLimit.z+6, drawSettings.debugA))-7, resDistance);
    //#endif CreateSlabZ
    return resDistance;
}

fn dAtomsColor(p: vec3<f32>) -> SdfResult {
    var result: SdfResult = dAtomsInBinColor(p, intersecting);
    return result;
}

//todo: add preprocessing that can replace these values
override atomColorCr = 0.6;
override atomColorCg = 0.9;
override atomColorCb = 0.3;

override atomColorNr = 0.95;
override atomColorNg = 0.05;
override atomColorNb = 0.25;

override atomColorOr = 0.20;
override atomColorOg = 0.05;
override atomColorOb = 0.95;

override atomColorSr = 0.995;
override atomColorSg = 0.995;
override atomColorSb = 0.025;

override bgColorR = 0.15;
override bgColorG = 0.0;
override bgColorB = 0.15;

fn getAtomColor(w: f32) -> vec4<f32> {
    let numberWithoutType = w%5000000.0;
    let aminoAtomType = w/5000000.0;
    let atomNumber = numberWithoutType%100.0;
    let chainNumber = numberWithoutType/100.0;
    var color = vec4(10.0, 10.0, 10.0, 1.0);
    if (atomNumber < 6.5) {
        color = vec4(atomColorCr, atomColorCg, atomColorCb, 1.0); // C
    } else if (atomNumber < 7.5) {
        color = vec4(atomColorNr, atomColorNg, atomColorNb, 1.0); // N
    } else if (atomNumber < 8.5) {
        color = vec4(atomColorOr, atomColorOg, atomColorOb, 1.0); // O
    } else if (atomNumber < 16.5) {
        color = vec4(atomColorSr, atomColorSg, atomColorSb, 1.0); // S
    }
    //#if UseColorByChainNumber
    color = getRandomColor(floor(chainNumber));
    //color = getPaletteColor(floor(chainNumber));
    //#endif UseColorByChainNumber
    if (aminoAtomType > 1) {
        //#ifnot DontHighlightMainChain
        color = color/5+vec4(0.85, 0.85, 0.85, 0);
        //#endifnot DontHighlightMainChain
    } else {
        //#ifnot DontHighlightMainChain
        color = color/1.275;
        //#endifnot DontHighlightMainChain
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
    let radius = covalentRadius(atom.number)+drawSettings.kSmoothminScale*addSmoothMinMargin*0.5;
	let oc = origin - center;
	let b = dot(direction, oc);
	let c = dot(oc, oc) - (radius*radius);

	let det = b*b - c;
	if (det < 0.0) {return miss;}

	let t = -b - sqrt(det);
	//if (t < 0.0) {t = -b + sqrt(det);}
	if (t < 0.0) {return miss;}

	let intersection = origin + t * direction;
	let t2 = -b + sqrt(det);
    return Hit(t, intersection, t2, atom.number);
}

var<private> start: vec3<f32>;
var<private> end: f32;
const stackSize = 48;
var<private> stackCurrentNum = 0;
var<private> stackT: array<f32, stackSize>;
var<private> stackBins: array<i32, stackSize>;

fn resetStack() {
    for (var i : i32 = 0; i < stackSize; i++) {
        stackT[i] = 10000000.0;
        stackBins[i] = -1;
    }
}

fn insertIntoSortedStack(t: f32, bin: i32) {
    for (var i : i32 = 0; i < min(stackSize, stackCurrentNum+1); i++) {
        if (stackT[i] > t) {
            for (var j : i32 = min(stackSize, stackCurrentNum+1)-1; j >= i+1; j--) {
                stackT[j] = stackT[j-1];
                stackBins[j] = stackBins[j-1];
            }
            stackT[i] = t;
            stackBins[i] = bin;
            break;
        }
    }
    stackCurrentNum++;
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

fn getFirstIndexByDistance(origin: vec3<f32>) -> i32 {
    var closest: i32 = -1;
    var closestDistance: f32 = 100000.0;
    for (var i : i32 = 0; i < 8; i++) {
        let center = (bins.bins[i].min+bins.bins[i].max)/2;
        let dist = distance(origin, center);
        if (dist < closestDistance) {
            closestDistance = dist;
            closest = i;
        }
    }
    return closest;
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
										if (hit.t > intersectionFinal.y || hit.t2 < intersectionFinal.x) {
											continue;
										}
                                        if (hit.t < miss.t) {
                                            //#ifnot DontSkipUsingRealHits
                                            let realHit: Hit = raySphereIntersection(origin, direction, atoms.atoms[a], 0);
                                            if (closestRealHitT > realHit.t) {
                                                closestRealHitAtom = a;
                                                closestRealHitT = realHit.t;
                                            }
                                            //#endifnot DontSkipUsingRealHits
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
    let intersectionEnd = aabbIntersection(origin, direction, inverseDirection, bins.bins[stackBins[0]].min, bins.bins[stackBins[0]].max);
    end = intersectionEnd.y-stackT[0];
    //let binSize = bins.bins[stackBins[0]].max-bins.bins[stackBins[0]].min;
    //end = min(max(binSize.x, max(binSize.y, binSize.z)), stackT[1])+drawSettings.kSmoothminScale;
    if (drawSettings.debugMode == DM_SkipStackPos0) {
        intersecting = stackBins[1];
        start = start+direction*stackT[1];
        let intersectionEnd = aabbIntersection(origin, direction, inverseDirection, bins.bins[stackBins[1]].min, bins.bins[stackBins[1]].max);
        end = intersectionEnd.y-stackT[1];
    }
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
    //#if FirstIndexBasedOnDistance
    let closestId = getFirstIndexByDistance(origin);
    binsStack[0] = closestId;
    binsStackNum++;
    //#endif FirstIndexBasedOnDistance
    for (var i : i32 = 0; i < 8; i++) {
        var firstId = getFirstIndexUsingOrigin(origin, i);
        //#if FirstIndexBasedOnDistance
        if (firstId == closestId) {
            continue;
        }
        //#endif FirstIndexBasedOnDistance
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
                    //#if DontRaytraceAtoms
                    closestT = intersectionI.x;
                    //#endif DontRaytraceAtoms
                    //#ifnot DontRaytraceAtoms
                    for (var a: i32 = i32(bins.bins[i].start); a < i32(bins.bins[i].end); a++) {
                        let hit: Hit = raySphereIntersection(origin, direction, atoms.atoms[a], 1);
                        numRaySphereIntersections++;
                        if (hit.t > intersectionI.y || hit.t2 < intersectionI.x) {
                            continue;
                        }
                        if (hit.t < miss.t) {
                            //#ifnot DontSkipUsingRealHits
                            let realHit: Hit = raySphereIntersection(origin, direction, atoms.atoms[a], 0);
                            if (closestRealHitT > realHit.t) {
                                closestRealHitAtom = a;
                                closestRealHitT = realHit.t;
                                if (drawSettings.isFullRender > 0.5) {
                                    if (drawSettings.debugA < 0.15 || drawSettings.debugMode >= DM_GroupStart_Transparent) {
                                        closestRealHitT = 1000000;
                                    }
                                }
                            }
                            //#endifnot DontSkipUsingRealHits
                            if (hit.t < closestT) {
                                closestT = hit.t;
                                if (hit.t < intersectionI.x) {
                                    closestT = intersectionI.x;
                                }
                            }
                        }
                    }
                    //#endifnot DontRaytraceAtoms
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
    let intersectionEnd = aabbIntersection(origin, direction, inverseDirection, bins.bins[stackBins[0]].min, bins.bins[stackBins[0]].max);
    end = intersectionEnd.y-stackT[0];
    //let binSize = bins.bins[stackBins[0]].max-bins.bins[stackBins[0]].min;
    //end = min(max(binSize.x, max(binSize.y, binSize.z)), stackT[1])+drawSettings.kSmoothminScale;
    if (drawSettings.debugMode == DM_SkipStackPos0) {
        intersecting = stackBins[1];
        start = start+direction*stackT[1];
        let intersectionEnd = aabbIntersection(origin, direction, inverseDirection, bins.bins[stackBins[1]].min, bins.bins[stackBins[1]].max);
        end = intersectionEnd.y-stackT[1];
    }
    return start;
}

var<private> depthOutput: f32;

const maxIterations = 500;
fn raymarch(initStart: vec3<f32>, rayDirection: vec3<f32>) -> vec4<f32> {
    var maxDistance: f32 = -1.0;
    var raymarchedAtoms: f32 = bins.bins[intersecting].end-bins.bins[intersecting].start;
    var iterationsMultiplier = 1.0;
    if (drawSettings.isFullRender < 0.5) {
        iterationsMultiplier = 0.125;
    }

    var t : f32 = 0.0;
    var pos : vec3<f32> = vec3(0.0);
    var iteration = 0;
    var resultColor = vec4(0.0, 0.0, 0.0, 1.0);
    //#if UseCartoonEdges
    var accDist = 0.0;
    //#endif UseCartoonEdges
    if (drawSettings.isFullRender > 0.5) {
        resultColor = vec4(bgColorR, bgColorG, bgColorB, 1.0);
    }
    var stackPos = 0;
    for (iteration = 0; iteration < i32(f32(maxIterations)*iterationsMultiplier); iteration++) {
        pos = start+t*rayDirection;
        if (distance(pos, cameraPos.xyz) > maxDistance) { maxDistance = distance(pos, cameraPos.xyz); }
		let d = dAtoms(pos);
        //#if UseCartoonEdges
        accDist += pow(d, 0.25+drawSettings.debugA*0.95);
        if (accDist > 4) {
            break;
        }
        //accDist += pow(d, 0.7969);
        //#endif UseCartoonEdges
		t = t+d;
        if (drawSettings.isFullRender < 0.5) {
            t += 0.1;
        }
		if (t > end) {
            t = end;
        }
        
        //todo: increase tolarance on !fullrender
		//if (d < 0.005+0.05*(1-drawSettings.isFullRender)) {
        if (d < 0.05) {
            resultColor = vec4(-0.25, 0.05, 0.25, 1.0)+dAtomsColor(pos).color/2;
            break;
		}
		if (t >= end) {
            //#ifnot DontAllowResetRaymarch
            t = 0.0;
            stackPos++;
            if (stackPos == stackSize || stackBins[stackPos] == -1) {
                if (drawSettings.debugMode == DM_Octree1) {
                    return debugModeOctree(numRaySphereIntersections, drawSettings.totalAtoms);
                } else if (drawSettings.debugMode == DM_Octree2) {
                    return debugModeOctree2(numIntersected, iteration, maxIterations);
                } else if (drawSettings.debugMode == DM_StackSteps) {
                    return debugModeSteps(stackPos, stackSize);
                } else if (drawSettings.debugMode == DM_Iterations) {
                    return debugModeIterations(iteration*5, maxIterations);
                } else if (drawSettings.debugMode == DM_SmoothminBoundaries) {
                    return vec4(0.65, 0.1, 0.45, 1.0);
                }
                if (stackPos == stackSize && drawSettings.debugB > 0.5) {
                    return vec4(10.15, 10.0, 0.15, 1.0);
                }
                //#if UseCartoonEdges
                /*
                return vec4(0.0, 0.0, 0.0, 1.0);
                */
                //#endif UseCartoonEdges
                //#ifnot UseCartoonEdges
                return vec4(bgColorR, bgColorG, bgColorB, 1.0);
                //#endifnot UseCartoonEdges
            }

            intersecting = stackBins[stackPos];
            start = initStart.xyz+rayDirection*stackT[stackPos];
            let intersectionEnd = aabbIntersection(initStart.xyz, rayDirection, 1.0/rayDirection, bins.bins[intersecting].min, bins.bins[intersecting].max);
            end = intersectionEnd.y-stackT[stackPos];
            //todo: clean up code.
            //todo: preprocessor macros? shader variations?
            //let binSize = bins.bins[intersecting].max-bins.bins[intersecting].min;
            //end = max(binSize.x, max(binSize.y, binSize.z));
            raymarchedAtoms += bins.bins[intersecting].end-bins.bins[intersecting].start;
            //#endifnot DontAllowResetRaymarch
            //#if DontAllowResetRaymarch
            resultColor = vec4(0.0, 0.0, 0.0, 1.0);
            break;
            //#endif DontAllowResetRaymarch
		}
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
    var distanceFade = pow(cameraDistance/(limitsMax*1.2), 2.5);
    //var distanceFade = pow(cameraDistance/(limitsMax*1.2), 1.0+drawSettings.debugA*2);
    let lightDirection = vec3(drawSettings.lightDirectionX, drawSettings.lightDirectionY, drawSettings.lightDirectionZ);
    depthOutput = distance(cameraPos.xyz, pos);
    //#if UseCartoonEdges
    if (accDist > 1.7) {
    //if (accDist > 0.1+drawSettings.debugB*2) {
        resultColor -= max(f32(accDist-1.7), 0.0)*vec4(0.425, 0.425, 0.425, 0);
        //resultColor -= max(f32(accDist-(0.1+drawSettings.debugB*2)), 0.0)*vec4(0.425, 0.425, 0.425, 0);
    }
    //#endif UseCartoonEdges
    //#if DontUseDistanceFade
    distanceFade = 1.0;
    //#endif DontUseDistanceFade
    //#if UseCenterDistanceFade
    distanceFade = distanceFade*mix(0.05, 1.0, saturate(0.01+pow(distance(pos, center)/min(cameraDistance, limitsMax*(drawSettings.debugB*0.95+0.15)), 1.525-1.495*drawSettings.debugA)));
    //#endif UseCenterDistanceFade
    if (drawSettings.debugMode == DM_Default) {
        //default
        return resultColor*distanceFade;
    } else if (drawSettings.debugMode == DM_DefaultBright) {
        return debugModeBright(resultColor, distanceFade);
    } else if (drawSettings.debugMode == DM_DefaultWithBase) {
        return debugModeDefaultWithBase(resultColor, distanceFade, closestRealHitT, getAtomColor(atoms.atoms[closestRealHitAtom].number), distance(initStart, pos));
    } else if (drawSettings.debugMode == DM_SemiLit) {
        return debugModeSemilit(resultColor, distanceFade, findNormal(pos), lightDirection);
    } else if (drawSettings.debugMode == DM_Lit) {
        return debugModeLit(resultColor, distanceFade, findNormal(pos), lightDirection);
    } else if (drawSettings.debugMode == DM_LitGooch) {
        return debugModeGooch(resultColor, distanceFade, findNormal(pos), lightDirection);
    } else if (drawSettings.debugMode == DM_LitSpecular) {
        return debugModeLitSpecular(resultColor, rayDirection, distanceFade, findNormal(pos), lightDirection);
    } else if (drawSettings.debugMode == DM_SemilitWithBase) {
        return debugModeSemilitWithBase(resultColor, distanceFade, closestRealHitT, getAtomColor(atoms.atoms[closestRealHitAtom].number), distance(initStart, pos), findNormal(pos), lightDirection);
    } else if (drawSettings.debugMode == DM_Iterations) {
        return debugModeIterations(iteration*5, maxIterations);
    } else if (drawSettings.debugMode == DM_Octree1) {
        return debugModeOctree(numRaySphereIntersections, drawSettings.totalAtoms);
    } else if (drawSettings.debugMode == DM_Octree2) {
        return debugModeOctree2(numIntersected, iteration, maxIterations);
    } else if (drawSettings.debugMode == DM_Octree3) {
        return debugModeOctree3(numRaySphereIntersections, numIntersected, intersecting);
    } else if (drawSettings.debugMode == DM_Depth) {
        return debugModeDepth(maxDistance);
    } else if (drawSettings.debugMode == DM_Normals) {
        return debugModeNormals(findNormal(pos));
    } else if (drawSettings.debugMode == DM_TransparentFake1) {
        return debugModeFakeTransparency(resultColor, distanceFade, distance(initStart, pos), initStart, rayDirection);
    } else if (drawSettings.debugMode == DM_TransparentFake2) {
        //todo fake transparency with const color but somehow scale it according to the result color? (justt grayscale it?)
        //todo: transparency with const color but somehow also scaled by result color (or lighting?)
        return debugModeFakeTransparency2(resultColor, distanceFade, distance(initStart, pos), initStart, rayDirection);
    } else if (drawSettings.debugMode == DM_StackSteps) {
        return debugModeSteps(stackPos, stackSize);
    } else if (drawSettings.debugMode == DM_RaymarchedAtoms) {
        return debugModeRaymarchedAtoms(raymarchedAtoms);
    } else if (drawSettings.debugMode == DM_SmoothminBoundaries) {
        return resultColor*distanceFade;
    } else if (drawSettings.debugMode == DM_TToEnd) {
        return debugModeTEnd(t, end);
    } else if (drawSettings.debugMode == DM_AllStepsDistance) {
        return debugModeDepth(end*30);
    } else if (drawSettings.debugMode == DM_DebugCombined) {
        return debugModeDebug(numRaySphereIntersections, numIntersected, intersecting, stackPos, resultColor, iteration, closestRealHitT);
    } else if (drawSettings.debugMode == DM_BlankStackPos0) {
        return debugModeHideStackPos(resultColor, stackPos, 0, distanceFade);
    } else if (drawSettings.debugMode == DM_BlankStackPos1) {
        return debugModeHideStackPos(resultColor, stackPos, 1, distanceFade);
    } else if (drawSettings.debugMode == DM_BlankStackPos2) {
        return debugModeHideStackPos(resultColor, stackPos, 2, distanceFade);
    } else if (drawSettings.debugMode == DM_BlankStackPos3) {
        return debugModeHideStackPos(resultColor, stackPos, 3, distanceFade);
    } else if (drawSettings.debugMode == DM_BlankStackPos4) {
        return debugModeHideStackPos(resultColor, stackPos, 4, distanceFade);
    } else if (drawSettings.debugMode == DM_BlankStackPos5) {
        return debugModeHideStackPos(resultColor, stackPos, 5, distanceFade);
    } else if (drawSettings.debugMode == DM_BlankStackPos6) {
        return debugModeHideStackPos(resultColor, stackPos, 6, distanceFade);
    } else if (drawSettings.debugMode == DM_BlankStackPos7) {
        return debugModeHideStackPos(resultColor, stackPos, 7, distanceFade);
    } else if (drawSettings.debugMode == DM_SkipStackPos0) {
        return resultColor*distanceFade; //skip step0
    }
    return resultColor*distanceFade;
}

fn raymarchTransparent(initStart: vec3<f32>, rayDirection: vec3<f32>) -> vec4<f32> {
    var maxDistance: f32 = -1.0;
    var raymarchedAtoms: f32 = bins.bins[intersecting].end-bins.bins[intersecting].start;
    var iterationsMultiplier = 1.0;
    if (drawSettings.isFullRender < 0.5) {
        iterationsMultiplier = 0.05;
    }

    var t : f32 = 0.0;
    var pos : vec3<f32> = vec3(0.0);
    var iteration = 0;
    let startColor = vec4(-0.25, 0.05, 0.25, 1.0);
    var resultColor = startColor;
    var stackPos = 0;
    var insideStartT = -10000.0;
    //todo: add limit iterations slider
	for (iteration = 0; iteration < i32(f32(maxIterations)*iterationsMultiplier); iteration++) {
		pos = start+t*rayDirection;
        if (distance(pos, cameraPos.xyz) > maxDistance) { maxDistance = distance(pos, cameraPos.xyz); }
		let d = dAtoms(pos);
		if (d < 0.05) {
            if (drawSettings.debugMode == DM_Transparent3) {
                resultColor += vec4(0.01, 0.01, 0.01, 0.0)*mix(0.1, 3, drawSettings.debugA)*mix(1, 0, clamp((d+0.75), 0, 1));
            } else if (drawSettings.debugMode == DM_Transparent2) {
                resultColor += (dAtomsColor(pos).color/50)*mix(0.1, 3, drawSettings.debugA);
            } else if (drawSettings.debugMode == DM_TransparentDistance) {
                if (insideStartT == -10000.0) {
                    insideStartT = t;
                }
            } else if (drawSettings.debugMode == DM_TransparentConst) {
                resultColor += vec4(0.005, 0.005, 0.005, 0.0)*mix(0.1, 3, drawSettings.debugA);
            } else {
                resultColor += vec4(0.01, 0.01, 0.01, 0.0)*mix(0.1, 3, drawSettings.debugA);
            }
            if (drawSettings.debugMode == DM_TransparentConst) {
                t = t+mix(0.025, 0.15, drawSettings.debugB);
            } else {
                t = t+abs(d)+mix(0, 0.05, drawSettings.debugB);
            }
		} else {
            if (drawSettings.debugMode == DM_TransparentDistance) {
                if (insideStartT != -10000.0) {
                    resultColor += vec4(0.01, 0.01, 0.01, 0.0)*mix(0.1, 3, drawSettings.debugA)*(t-insideStartT)*5;
                    insideStartT = -10000.0;
                }
            }
            t = t+abs(d);
            if (drawSettings.isFullRender < 0.5) {
                t += 0.1;
            }
        }
        
		if (t >= end) {
            if (drawSettings.debugMode == DM_TransparentDistance) {
                if (insideStartT != -10000.0) {
                    resultColor += vec4(0.01, 0.01, 0.01, 0.0)*mix(0.1, 3, drawSettings.debugA)*(t-insideStartT)*5;
                    insideStartT = -10000.0;
                }
            }
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
	}
    if (distance(resultColor, startColor) < 0.009) {
        return vec4(bgColorR, bgColorG, bgColorB, 1.0);
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

struct FragmentOutput {
    @builtin(frag_depth) depth: f32,
    @location(0) color: vec4<f32>
}

@fragment
fn fs_main(@builtin(position) position: vec4<f32>, @location(0) vPos: vec4<f32>) -> FragmentOutput {
    let screenPos = vPos;

    // ray direction in normalized device coordinate
    let ndcRay = vec4(screenPos.xy, 1.0, 1.0);

    // convert ray direction from normalized device coordinate to world coordinate
    let rayDirection: vec3<f32> = normalize((inverseVpMatrix * ndcRay).xyz);
    //let rayDirection : vec3<f32> = ndcRay.xyz;
    start = cameraPos.xyz;

    //#if ShowDebugColorMap
    if (drawSettings.debugMode >= DM_GroupStart_Debug && drawSettings.debugMode < DM_GroupEnd_Debug) {
        if (position.x >= 10 && position.x < 110 && position.y >= 4 && position.y <= 8) {
            return FragmentOutput(depthOutput, debugModeColormap(drawSettings.debugMode, (position.x-1)/100.0));
        }
    }
    //#endif ShowDebugColorMap
    
    let margin = max(drawSettings.atomsScale, drawSettings.kSmoothminScale);
    let limitsSize = drawSettings.maxLimit.xyz-drawSettings.minLimit.xyz;
    let limitsMax = max(max(limitsSize.x, limitsSize.y), limitsSize.z);
    //#ifnot DontUseInitBoundaryOptimization
    let boundaryIntersection : vec2<f32> = aabbIntersection(start, rayDirection, 1.0/rayDirection, drawSettings.minLimit.xyz, drawSettings.maxLimit.xyz);
    if (boundaryIntersection.x < boundaryIntersection.y && boundaryIntersection.x > -30) {
        if (boundaryIntersection.x > 0) {
            start = start+rayDirection*boundaryIntersection.x;
        }
    } else if (boundaryIntersection.x >= boundaryIntersection.y) {
        return FragmentOutput(depthOutput, vec4(bgColorR, bgColorG, bgColorB, 1.0));
    }
    //#endifnot DontUseInitBoundaryOptimization

    let initStart = start;

    var closestAABB: vec3<f32>;
    //todo readd and benchmark
    /*if (drawSettings.treeLayers == 4) {
        closestAABB = findIntersectingCells(start, rayDirection);
    } else*/ {
        closestAABB = findIntersectingCellsStack(start, rayDirection);
    }
    
    //#if FirstIndexBasedOnDistance
    if (drawSettings.debugMode == DM_ClosestOctree) {
        let index = getFirstIndexByDistance(initStart);
        let center = (bins.bins[index].min+bins.bins[index].max)/2;
        //return FragmentOutput(depthOutput, debugModeDepth(f32(index*5)*30));
        return FragmentOutput(depthOutput, debugModeDepth(f32(index*5)*20+distance(center, start)*30));
    }
    //#endif FirstIndexBasedOnDistance
    if (drawSettings.debugMode == DM_Octree1) {
        return FragmentOutput(depthOutput, debugModeOctree(numRaySphereIntersections, drawSettings.totalAtoms));
    } else if (drawSettings.debugMode == DM_Octree2) {
        return FragmentOutput(depthOutput, debugModeOctree2(numIntersected, 0, maxIterations));
    } else if (drawSettings.debugMode == DM_Octree3) {
        return FragmentOutput(depthOutput, debugModeOctree3(numRaySphereIntersections, numIntersected, intersecting));
    }
    if (intersecting == -1) {
        return FragmentOutput(depthOutput, vec4(bgColorR, bgColorG, bgColorB, 1.0));
    }
    //start = start+rayDirection*(closestAABB.x-10.0);

    if (drawSettings.debugMode == DM_FirstStepDistance) {
        return FragmentOutput(depthOutput, debugModeDepth(end*30));
    }
    if (drawSettings.debugMode == DM_Transparent1 || drawSettings.debugMode == DM_Transparent2 || drawSettings.debugMode == DM_Transparent3 
        || drawSettings.debugMode == DM_TransparentDistance || drawSettings.debugMode == DM_TransparentConst) {
        return FragmentOutput(depthOutput, raymarchTransparent(initStart, rayDirection));
    }
    return FragmentOutput(depthOutput, raymarch(initStart, rayDirection));
}

//utilities.wgsl inserted here
//drawModeDefinitions.wgsl inserted here
