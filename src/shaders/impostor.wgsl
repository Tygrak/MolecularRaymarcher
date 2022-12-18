@binding(0) @group(0) var<uniform> mvpMatrix : mat4x4<f32>;
@binding(1) @group(0) var<uniform> vMatrix : mat4x4<f32>;
@binding(2) @group(0) var<uniform> cameraPos : vec4<f32>;

struct DrawSettings {
    amount : f32,
    start : f32,
    pad1 : f32,
    atomScale : f32,
}
@binding(0) @group(1) var<uniform> drawSettings : DrawSettings;

struct Output {
    @builtin(position) position : vec4<f32>,
    @location(0) color : vec4<f32>,
    @location(1) uv : vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) index: u32, @location(0) pos: vec4<f32>, @location(1) color: vec4<f32>, @location(2) atomInfo: vec2<f32>) -> Output {
    //atomInfo x=number, y=covalentRadius 
    let mvp = mvpMatrix;
    let v = vMatrix;
    let cPos = cameraPos;
    //let cameraRight : vec4<f32> = vec4(1, 0, 0, 0);
    //let cameraUp : vec4<f32> = vec4(0, 1, 0, 0);
    let cameraRight = vec4(1, 0, 0, 0)*vMatrix;
    let cameraUp = vec4(0, 1, 0, 0)*vMatrix;
    var output: Output;
    output.position = pos;
    let scale = drawSettings.atomScale*atomInfo.y;
    if (index%6 == 0) {
        output.position = pos + cameraRight*(-0.5)*scale + cameraUp*(-0.5)*scale;
        output.uv = vec2(0, 0);
    } else if (index%6 == 1 || index%6 == 3) {
        output.position = pos + cameraRight*(0.5)*scale + cameraUp*(-0.5)*scale;
        output.uv = vec2(1, 0);
    } else if (index%6 == 2 || index%6 == 4) {
        output.position = pos + cameraRight*(-0.5)*scale + cameraUp*(0.5)*scale;
        output.uv = vec2(0, 1);
    } else if (index%6 == 5) {
        output.position = pos + cameraRight*(0.5)*scale + cameraUp*(0.5)*scale;
        output.uv = vec2(1, 1);
    }
    output.position = mvpMatrix * output.position;
    output.color = color;
    return output;
}

@fragment
fn fs_main(@builtin(position) position : vec4<f32>, @location(0) color: vec4<f32>, @location(1) uv: vec2<f32>) -> @location(0) vec4<f32> {
    var result = color;
    let amount = drawSettings.amount;
    if (amount > 0) {
        result.b = result.b*1.1; 
    }
    if (pow(uv.x-0.5, 2)+pow(uv.y-0.5, 2) > 0.25) {
        discard;
    }
    return result;
}