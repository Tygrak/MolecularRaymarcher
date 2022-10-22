@fragment
fn main(@location(0) inColor: vec3<f32>, @location(1) inUv: vec2<f32>) -> @location(0) vec4<f32> {
    var pos = (inUv-vec2(0.5))*2;
    if (pow(pos.x, 2)+pow(pos.y,2) > 1) {
        discard;
    }
    return vec4<f32>(inUv, 1.0, 1.0);
}