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
    pad1: f32,
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
    atomNumber : f32, 
}

struct Hit {
    t: f32,
	intersection: vec3<f32>,
    normal: vec3<f32>,
    atomNumber: f32,
}

const miss: Hit = Hit(1e20, vec3(0.0), vec3(0.0), -1);

fn opSmoothUnion(d1: f32, d2: f32, k: f32) -> f32 {
    let h = clamp(0.5 + 0.5*(d2-d1)/k, 0.0, 1.0);
    return mix(d2, d1, h) - k*h*(1.0-h); 
}

fn dSphere(p: vec3<f32>, center: vec3<f32>, radius: f32) -> f32 {
    return length(p-center)-radius;
}

fn covalentRadius(number: f32) -> f32 {
    if (number < 1.1) {
        return 1.0;
    } else if (number < 8.1) {
        //C/N/O
        return 0.68;
    }
    //S sulfur
    return 1.02;
}

fn child(index: i32, number: i32) -> i32 {
    let result = 8*(index+1)+number;
    return result;
}

fn parent(index: i32) -> i32 {
    let result = (index/8)-1;
    return result;
}

const stackSize = 24;
var<private> intersecting: i32;
var<private> numIterations: i32 = 0;
var<private> numIntersected: i32 = 0;

fn dAtoms(p: vec3<f32>) -> SdfResult {
    let start = i32(drawSettings.start);
    let amount = arrayLength(&atoms.atoms);
    let binsAmount =  arrayLength(&bins.bins);
    var minDistance = 1000000000.0;
    var resDistance = 1000000000.0;
    var atomNumber = -1.0;
    for (var i : i32 = i32(bins.bins[intersecting].start); i < i32(bins.bins[intersecting].end); i++) {
        let d = dSphere(p, atoms.atoms[i].position, covalentRadius(atoms.atoms[i].number));
        if (d < minDistance) {
            atomNumber = atoms.atoms[i].number;
            minDistance = d;
        }
        resDistance = opSmoothUnion(resDistance, d, 0.25);
        numIterations++;
    }
    var result: SdfResult;
    result.distance = resDistance;
    result.atomNumber = atomNumber;
    return result;
}

fn dScene(p: vec3<f32>) -> SdfResult {
    let sdfResult = dAtoms(p);
    return sdfResult;
}

fn getAtomColor(atomNumber: f32) -> vec4<f32> {
    if (atomNumber < 0) {
        return vec4(0.0, 0.0, 0.0, 1.0);
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

fn raySphereIntersection(origin: vec3<f32>, direction: vec3<f32>, atom: Atom) -> Hit {
    let center = atom.position;
    let radius = covalentRadius(atom.number);
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

fn findIntersectingCells(origin: vec3<f32>, direction: vec3<f32>) {
    var closestHit: Hit = miss;
    let binsAmount = arrayLength(&bins.bins);
    let inverseDirection = 1.0/direction;
    for (var i : i32 = 0; i < 8; i++) {
        let intersection = aabbIntersection(origin, direction, inverseDirection, bins.bins[i].min, bins.bins[i].max);
        if (intersection.x < intersection.y && intersection.x > -10) {
            numIntersected++;
            for (var j : i32 = child(i, 0); j < child(i, 8); j++) {
                let smallIntersection = aabbIntersection(origin, direction, inverseDirection, bins.bins[j].min, bins.bins[j].max);
                if (intersection.x < intersection.y && intersection.x > -10) {
                    numIntersected++;
                    for (var a: i32 = i32(bins.bins[j].start); a < i32(bins.bins[j].end); a++) {
                        let hit: Hit = raySphereIntersection(origin, direction, atoms.atoms[a]);
                        numIterations++;
                        if (hit.t < closestHit.t) {
                            closestHit = hit;
                            intersecting = j;
                        }
                    }
                }
            }
        }
    }
}

@fragment
fn fs_main(@builtin(position) position: vec4<f32>, @location(0) vPos: vec4<f32>) -> @location(0) vec4<f32> {
    let screenPos = vPos;

    // ray direction in normalized device coordinate
    let ndcRay = vec4(screenPos.xy, 1.0, 1.0);

    // convert ray direction from normalized device coordinate to world coordinate
    let rayDirection: vec3<f32> = normalize((inverseVpMatrix * ndcRay).xyz);
    //let rayDirection : vec3<f32> = ndcRay.xyz;
    var start : vec3<f32> = cameraPos.xyz; 
    let boundaryIntersection : vec2<f32> = aabbIntersection(start, rayDirection, 1.0/rayDirection, drawSettings.minLimit.xyz, drawSettings.maxLimit.xyz);
    if (boundaryIntersection.x < boundaryIntersection.y && boundaryIntersection.x > 0) {
        start = start+rayDirection*boundaryIntersection.x;
    } else if (boundaryIntersection.x >= boundaryIntersection.y) {
        return vec4(0.15, 0.0, 0.15, 1.0);
    }

    findIntersectingCells(start, rayDirection);

    var t : f32 = 0.0;
    var pos : vec3<f32> = vec3(0.0);
    var iteration = 0;
	for (iteration = 0; iteration < 40; iteration++) {
		if (t > 100.0) {
			return vec4(0.0, 0.0, 0.0, 1.0)+vec4(f32(iteration)/40.0, f32(numIterations)/100.0, f32(numIntersected)/48.0, 0);
		}
        pos = start+t*rayDirection;
		let sdfResult = dScene(pos);
        
		if (sdfResult.distance < 0.05) {
            return getAtomColor(sdfResult.atomNumber)+vec4(f32(iteration)/40.0, f32(numIterations)/100.0, f32(numIntersected)/48.0, 0.0);
            //return vec4(getAtomColor(sdfResult.atomNumber).xyz*f32(iteration)/25.0, 1.0);
			//return vec4(1.0-f32(iteration)/25.0, 1.0-f32(iteration)/25.0, 1.0-f32(iteration)/25.0, 1.0);
		}
		t = t+sdfResult.distance;
	}

    return vec4(0.35, 0.35, 0.35, 1.0)+vec4(f32(iteration)/40.0, f32(numIterations)/100.0, f32(numIntersected)/48.0, 0.0);
}