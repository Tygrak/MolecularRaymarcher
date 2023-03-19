//@group(0) @binding(0) var mySampler : sampler;
@group(0) @binding(0) var depthTexture : texture_depth_2d;

struct VertexOutput {
    @builtin(position) Position : vec4<f32>,
    @location(0) fragUV : vec2<f32>,
}

@vertex
fn vs_main(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {
    const pos = array(
        vec2( 1.0,  1.0),
        vec2( 1.0, -1.0),
        vec2(-1.0, -1.0),
        vec2( 1.0,  1.0),
        vec2(-1.0, -1.0),
        vec2(-1.0,  1.0),
    );

    const uv = array(
        vec2(1.0, 0.0),
        vec2(1.0, 1.0),
        vec2(0.0, 1.0),
        vec2(1.0, 0.0),
        vec2(0.0, 1.0),
        vec2(0.0, 0.0),
    );

    var output : VertexOutput;
    output.Position = vec4(pos[VertexIndex], 0.0, 1.0);
    output.fragUV = uv[VertexIndex];
    return output;
}

@fragment
fn fs_main(@location(0) fragUV : vec2<f32>, @builtin(position) coord : vec4<f32>) -> @location(0) vec4<f32> {
    //let depth = textureSample(myTexture, mySampler, fragUV);
    //return vec4(depth, depth, depth, 1.0);
    let depthValue = textureLoad(depthTexture, vec2<i32>(floor(coord.xy)), 0);
    return vec4<f32>(depthValue, depthValue, depthValue, 1.0);
}

