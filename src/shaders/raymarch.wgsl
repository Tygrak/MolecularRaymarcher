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

const stackSize = 256;
var<private> stack: array<i32, stackSize>;
var<private> numIterations: i32 = 0;

// finds the nearest atom in kdTree
fn findNearestAtom(p: vec3<f32>) -> Atom {
    //todo: stackless nearest neighbor
    
    var curr: i32 = 0;
    var bestDistance: f32 = 100000000;
    var bestNode: i32 = 0;
    var stackN: i32 = 1;
    stack[0] = 0;
    while (stackN > 0) {
        curr = stack[stackN-1];
        stackN--;
        numIterations++;
        if (curr > 1024) {
            break;
        }
        /*let pdim = 
        if (abs(p[dim]-atoms.atoms[curr].position[dim]) > bestDistance) {
            stack[stackN] = left(curr);
            stackN++;
        }*/
        let dim = DimOfNode(curr);
        let d = distance(atoms.atoms[curr].position, p);
        if (d < bestDistance) {
            bestDistance = d;
            bestNode = curr;
        }
        if (p[dim] > atoms.atoms[curr].position[dim] && right(curr) != -1) {
            if (left(curr) != -1 && atoms.atoms[left(curr)].number != -1 && abs(p[dim]-atoms.atoms[curr].position[dim]) < bestDistance) {
                stack[stackN] = left(curr);
                stackN++;
            }
            if (atoms.atoms[right(curr)].number == -1) {
                continue;
            }
            stack[stackN] = right(curr);
            stackN++;
        } else if (left(curr) != -1) {
            if (right(curr) != -1 && atoms.atoms[right(curr)].number != -1 && abs(p[dim]-atoms.atoms[curr].position[dim]) < bestDistance) {
                stack[stackN] = right(curr);
                stackN++;
            }
            if (atoms.atoms[left(curr)].number == -1) {
                continue;
            }
            stack[stackN] = left(curr);
            stackN++;
        }
    }
    return atoms.atoms[bestNode];
    
    /*
    var curr: i32 = 0;
    var i: i32 = 0;
    while (left(curr) != -1) {
        let dim = i % 3;
        i++;
        if (p[dim] > atoms.atoms[curr].position[dim] && right(curr) != -1) {
            if (atoms.atoms[right(curr)].number == -1) {
                break;
            }
            curr = right(curr);
        } else {
            if (atoms.atoms[left(curr)].number == -1) {
                break;
            }
            curr = left(curr);
        }
    }
    var bestD = distance(atoms.atoms[curr].position, p);
    var bestNode: i32 = curr;
    i--;
    while (parent(curr) != -1) {
        let dim = i % 3;
        i--;
        let prev = curr;
        curr = parent(curr);
        let d = distance(atoms.atoms[curr].position, p);
        if (d < bestD) {
            bestD = d;
            bestNode = curr;
        }
        var subDim = dim;
        var subtreeCurr = curr;
        if (right(curr) == prev && left(curr) != -1) {
            subtreeCurr = left(curr);
        } else if (right(curr) != -1) {
            subtreeCurr = right(curr);
        } else {
            continue;
        }
        while (subtreeCurr != -1 && abs(atoms.atoms[subtreeCurr].position[subDim]-p[subDim]) < bestD && left(subtreeCurr) != -1) {
            subDim = (subDim+1) % 3;
            let subD = distance(atoms.atoms[subtreeCurr].position, p);
            if (subD < bestD) {
                bestD = subD;
                bestNode = subtreeCurr;
            }
            if (p[subDim] > atoms.atoms[subtreeCurr].position[subDim] && right(subtreeCurr) != -1) {
                if (atoms.atoms[right(subtreeCurr)].number == -1) {
                    break;
                }
                subtreeCurr = right(subtreeCurr);
            } else {
                if (atoms.atoms[left(subtreeCurr)].number == -1) {
                    break;
                }
                subtreeCurr = left(subtreeCurr);
            }
        }
    }
    return atoms.atoms[bestNode];*/
}

fn dAtoms(p: vec3<f32>) -> SdfResult {
    let start = i32(drawSettings.start);
    /*let amount = arrayLength(&atoms.atoms);
    var minDistance = 1000000000.0;
    var resDistance = 1000000000.0;
    var atomNumber = -1.0;
    for (var i : i32 = start; i < i32(drawSettings.amount)+start; i++) {
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
    result.atomNumber = atomNumber;*/
    let atom = findNearestAtom(p);
    var result: SdfResult;
    result.distance = dSphere(p, atom.position, covalentRadius(atom.number));
    result.atomNumber = atom.number;
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
    var iteration = 0;
	for (iteration = 0; iteration < 50; iteration++) {
		if (t > 200.0) {
			return vec4(0.0, 0.0, 0.0, 1.0)+vec4(f32(iteration)/100.0, (f32(numIterations)/100.0)/f32(iteration), 0, 0);
		}
        pos = start+t*rayDirection;
		let sdfResult = dScene(pos);
        
		if (sdfResult.distance < 0.05) {
            return getAtomColor(sdfResult.atomNumber)+vec4(f32(iteration)/100.0, (f32(numIterations)/100.0)/f32(iteration), 0.0, 0.0);
            //return vec4(getAtomColor(sdfResult.atomNumber).xyz*f32(iteration)/25.0, 1.0);
			//return vec4(1.0-f32(iteration)/25.0, 1.0-f32(iteration)/25.0, 1.0-f32(iteration)/25.0, 1.0);
		}
		t = t+sdfResult.distance;
	}

    return vec4(0.35, 0.35, 0.35, 1.0)+vec4(f32(iteration)/100.0, (f32(numIterations)/100.0)/f32(iteration), 0.0, 0.0);
}