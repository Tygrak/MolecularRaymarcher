import { mat4, vec3 } from "gl-matrix";
import { CreateGPUBuffer } from "./helper";
import { CreateBondGeometry, CreateLineGeometry, CreateSphereGeometry } from "./meshHelpers";
import { Octree } from "./octree";
import shaderTextureQuad from './shaders/fullscreenTextureQuad.wgsl';

export class TextureVisualizeQuad {
    device: GPUDevice;
    quadPositionsBuffer : GPUBuffer;
    quadColorsBuffer : GPUBuffer;
    pipeline: GPURenderPipeline;
    sampler: GPUSampler;
    
    uniformBindGroup: GPUBindGroup;

    constructor (device: GPUDevice, format: GPUTextureFormat, textureView: GPUTextureView) {
        this.device = device;
        let t0 = performance.now();
        let positions = new Float32Array([
            -1, -1, 0,
            1, -1, 0,
            -1, 1, 0, 
            1, -1, 0,
            1, 1, 0,
            -1, 1, 0,
        ]);
        let colors = new Float32Array(positions);
        this.quadPositionsBuffer = CreateGPUBuffer(device, positions);
        this.quadColorsBuffer = CreateGPUBuffer(device, colors);
        this.sampler = device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear'
        });

        const depthTextureBindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {
                        sampleType: 'depth',
                    },
                },
            ],
        });
        
        
        this.pipeline = device.createRenderPipeline({
            layout: device.createPipelineLayout({
                bindGroupLayouts: [depthTextureBindGroupLayout]
            }),
            vertex: {
                module: device.createShaderModule({
                    code: shaderTextureQuad
                }),
                entryPoint: "vs_main",
                buffers:[
                    {
                        arrayStride: 4*3,
                        attributes: [{
                            shaderLocation: 0,
                            format: "float32x3",
                            offset: 0
                        }]
                    },
                    {
                        arrayStride: 4*3,
                        attributes: [{
                            shaderLocation: 1,
                            format: "float32x3",
                            offset: 0
                        }]
                    }
                ]
            },
            fragment: {
                module: device.createShaderModule({                    
                    code: shaderTextureQuad
                }),
                entryPoint: "fs_main",
                targets: [
                    {
                        format: format as GPUTextureFormat
                    }
                ]
            },
            primitive:{
                topology: "triangle-list",
            }
        });

        this.uniformBindGroup = device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: textureView,
                },
            ],
        });
    }

    public Draw(renderPass: GPURenderPassEncoder) {
        const numberOfVerticesToDraw = 6;
        renderPass.setPipeline(this.pipeline);
        renderPass.setBindGroup(0, this.uniformBindGroup);
        renderPass.setVertexBuffer(0, this.quadPositionsBuffer);
        renderPass.setVertexBuffer(1, this.quadColorsBuffer);
        renderPass.draw(numberOfVerticesToDraw);
    }
}