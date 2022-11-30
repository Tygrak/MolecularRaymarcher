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

fn dAtoms(p: vec3<f32>) -> SdfResult {
    let amount = arrayLength(&atoms.atoms);
    var minDistance = 1000000000.0;
    var resDistance = 1000000000.0;
    var atomNumber = -1.0;
    for (var i : i32 = i32(drawSettings.start); i < i32(drawSettings.amount)+i32(drawSettings.start); i++) {
        //let d = opSmoothUnion(minDistance, dSphere(p, atoms.atoms[i].position, covalentRadius(atoms.atoms[i].number)), 1.0);
        let d = dSphere(p, atoms.atoms[i].position, covalentRadius(atoms.atoms[i].number));
        if (d < minDistance) {
            atomNumber = atoms.atoms[i].number;
            minDistance = d;
        }
        resDistance = opSmoothUnion(resDistance, d, 1);
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
        return vec4(0.05, 0.05, 0.85, 1.0); // N
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
    let rayDirection : vec3<f32> = normalize((inverseVpMatrix * ndcRay).xyz);
    //let rayDirection : vec3<f32> = ndcRay.xyz;
    let start : vec3<f32> = cameraPos.xyz; 

    var t : f32 = 0.0;
    var pos : vec3<f32> = vec3(0.0);
	for (var iteration = 0; iteration < 35; iteration++) {
		if (t > 200.0) {
			return vec4(0.0, 0.0, 0.0, 1.0);
		}
        pos = start+t*rayDirection;
		let sdfResult = dScene(pos);
        
		if (sdfResult.distance < 0.025) {
            return getAtomColor(sdfResult.atomNumber);
            //return vec4(getAtomColor(sdfResult.atomNumber).xyz*f32(iteration)/25.0, 1.0);
			//return vec4(1.0-f32(iteration)/25.0, 1.0-f32(iteration)/25.0, 1.0-f32(iteration)/25.0, 1.0);
		}
		t = t+sdfResult.distance;
	}

    return vec4(0.35, 0.35, 0.35, 1.0);
}