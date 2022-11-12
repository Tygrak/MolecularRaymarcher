@binding(0) @group(0) var<uniform> mvpMatrix : mat4x4<f32>;
@binding(1) @group(0) var<uniform> inverseVpMatrix : mat4x4<f32>;
@binding(2) @group(0) var<uniform> cameraPos : vec4<f32>;

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

fn dSphere(p: vec3<f32>, center: vec3<f32>, radius: f32) -> f32 {
    return length(p-center)-radius;
}

fn dScene(p: vec3<f32>) -> f32 {
    let dist = min(dSphere(p, vec3(1, 0, 2), 1.5), dSphere(p, vec3(-1, 0, 2), 1.5));
    return dist;
}

@fragment
fn fs_main(@builtin(position) position : vec4<f32>, @location(0) vPos: vec4<f32>) -> @location(0) vec4<f32> {
    let screenPos = vPos;

    // ray direction in normalized device coordinate
    let ndcRay = vec4(screenPos.xy, 1.0, 1.0);

    // convert ray direction from normalized device coordinate to world coordinate
    let rayDirection : vec3<f32> = normalize((inverseVpMatrix * ndcRay).xyz);
    //let rayDirection : vec3<f32> = ndcRay.xyz;

    let cum = cameraPos;
    //let start : vec3<f32> = vec3(0, 0, -10); 
    let start : vec3<f32> = cameraPos.xyz; 

    var t : f32 = 0.0;
    var pos : vec3<f32> = vec3(0.0);
	for (var iteration = 0; iteration < 100; iteration++) {
		if (t > 200.0) {
			return vec4(0.0, 0.0, f32(iteration)/100.0, 1.0);
		}
        pos = start+t*rayDirection;
		let distance = dScene(pos);
		if (distance < 0.01) {
			return vec4(1.0, 1.0-pos.y/3, 1.0, 1.0);
		}
		t = t+distance;
	}

    return vec4(0.0, 0.0, 0.0, 1.0);
}