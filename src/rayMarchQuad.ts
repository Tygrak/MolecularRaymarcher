import { mat4, vec3, vec4 } from "gl-matrix";
import { CreateGPUBuffer } from "./helper";
import shader from './raymarch.wgsl';
import { Structure } from "./structure";

const numberOfVerticesToDraw = 6;

export class RayMarchQuad {
    quadPositions : GPUBuffer;
    quadColors : GPUBuffer;
    pipeline : GPURenderPipeline;
    mvpUniformBuffer : GPUBuffer;
    inverseVpUniformBuffer : GPUBuffer;
    cameraPosBuffer : GPUBuffer;
    atomsBuffer : GPUBuffer;
    uniformBindGroup : GPUBindGroup;
    
    constructor (device: GPUDevice, format: GPUTextureFormat) {
        let positions = new Float32Array([
            -1, -1, 0,
            1, -1, 0,
            -1, 1, 0, 
            1, -1, 0,
            1, 1, 0,
            -1, 1, 0,
        ]);
        let colors = new Float32Array(positions);
        this.quadPositions = CreateGPUBuffer(device, positions);
        this.quadColors = CreateGPUBuffer(device, colors);

        this.pipeline = device.createRenderPipeline({
            layout:'auto',
            vertex: {
                module: device.createShaderModule({                    
                    code: shader
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
                    code: shader
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
            },
            depthStencil:{
                format: "depth24plus",
                depthWriteEnabled: true,
                depthCompare: "less"
            }
        });

        this.mvpUniformBuffer = device.createBuffer({
            size: 64,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        
        this.inverseVpUniformBuffer = device.createBuffer({
            size: 64,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.cameraPosBuffer = device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.atomsBuffer = device.createBuffer({
            size: 0,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.uniformBindGroup = device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.mvpUniformBuffer,
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.inverseVpUniformBuffer,
                    }
                },
                {
                    binding: 2,
                    resource: {
                        buffer: this.cameraPosBuffer,
                    }
                }
            ]
        });
    }

    public Draw(device: GPUDevice, renderPass : GPURenderPassEncoder, mvpMatrix: mat4, inverseVpMatrix: mat4, cameraPos: vec3) {
        device.queue.writeBuffer(this.mvpUniformBuffer, 0, mvpMatrix as ArrayBuffer);
        device.queue.writeBuffer(this.inverseVpUniformBuffer, 0, inverseVpMatrix as ArrayBuffer);
        device.queue.writeBuffer(this.cameraPosBuffer, 0, vec4.fromValues(cameraPos[0], cameraPos[1], cameraPos[2], 1.0) as ArrayBuffer);
        renderPass.setPipeline(this.pipeline);
        renderPass.setBindGroup(0, this.uniformBindGroup);
        renderPass.setVertexBuffer(0, this.quadPositions);
        renderPass.setVertexBuffer(1, this.quadColors);
        renderPass.setPipeline(this.pipeline);
        renderPass.draw(numberOfVerticesToDraw);
    }
}