@binding(0) @group(0) var<uniform> mvpMatrix : mat4x4<f32>;
@binding(1) @group(0) var<uniform> inverseVpMatrix : mat4x4<f32>;
@binding(2) @group(0) var<uniform> cameraPos : vec4<f32>;

struct Atom {
    position : vec3<f32>,
    number : f32,
}

struct Atoms {
    atoms : array<Atom>,
}

@binding(0) @group(1) var<storage, read> atoms : Atoms;

struct DrawSettings {
    amount : f32,
    start : f32,
    pad1 : f32,
    pad2 : f32,
    minLimit : vec4<f32>,
    maxLimit : vec4<f32>,
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

struct Hit {
    t: f32,
	intersection: vec3<f32>,
    normal: vec3<f32>,
    atomNumber: f32,
}

const miss: Hit = Hit(1e20, vec3(0.0), vec3(0.0), -1);

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

fn left(index: i32) -> i32 {
    let amount = arrayLength(&atoms.atoms);
    let result = 2*index+1;
    if (result >= i32(amount)) {
        return -1;
    }
    return result;
}

fn right(index: i32) -> i32 {
    let amount = arrayLength(&atoms.atoms);
    let result = 2*index+2;
    if (result >= i32(amount)) {
        return -1;
    }
    return result;
}

fn parent(index: i32) -> i32 {
    if (index <= 0) {
        return -1;
    }
    let result = (index-1)/2;
    return result;
}

fn DimOfNode(i: i32) -> i32 {
    return i32(floor(log2(f32(i+1))))%3;
}

//const stackSize = 256;
//var<private> stack: array<i32, stackSize>;
//var<private> numIterations: i32 = 0;

// finds the nearest atom in kdTree
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

fn evaluateScene(origin: vec3<f32>, direction: vec3<f32>) -> Hit {
	var closestHit: Hit = miss;
    let start: i32 = i32(drawSettings.start);
    //for (var i : i32 = start; i < min(i32(drawSettings.amount)+start, i32(arrayLength(&atoms.atoms))); i++) {
    for (var i : i32 = start; i < i32(arrayLength(&atoms.atoms)); i++) {
        if (atoms.atoms[i].number == -1) {
            continue;
        }
        let hit: Hit = raySphereIntersection(origin, direction, atoms.atoms[i]);
        if (hit.t < closestHit.t) {
            closestHit = hit;
        }
    }
    return closestHit;
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

@fragment
fn fs_main(@builtin(position) position : vec4<f32>, @location(0) vPos: vec4<f32>) -> @location(0) vec4<f32> {
    let screenPos = vPos;

    // ray direction in normalized device coordinate
    let ndcRay = vec4(screenPos.xy, 1.0, 1.0);

    // convert ray direction from normalized device coordinate to world coordinate
    let rayDirection: vec3<f32> = normalize((inverseVpMatrix * ndcRay).xyz);
    //let rayDirection : vec3<f32> = ndcRay.xyz;
    var start: vec3<f32> = cameraPos.xyz;
    let boundaryIntersection : vec2<f32> = aabbIntersection(start, rayDirection, 1.0/rayDirection, drawSettings.minLimit.xyz, drawSettings.maxLimit.xyz);
    if (boundaryIntersection.x < boundaryIntersection.y && boundaryIntersection.x > 0) {
        start = start+rayDirection*boundaryIntersection.x;
    } else if (boundaryIntersection.x >= boundaryIntersection.y) {
        return vec4(0.15, 0.0, 0.15, 1.0);
    }

    let lightDir: vec3<f32> = normalize(vec3(0.1, 1.05, 0.3)); 

    let hit: Hit = evaluateScene(start, rayDirection);
    let ndotl: f32 = max(dot(hit.normal, lightDir), 0.0);

    return getAtomColor(hit.atomNumber);//*(ndotl+0.1);
}