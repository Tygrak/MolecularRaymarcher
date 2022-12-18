import { mat4, vec3, vec4 } from "gl-matrix";
import { GetAtomType } from "./atomDatabase";
import { CreateGPUBuffer } from "./helper";
import { KdTree } from "./kdtree";
import shader from './shaders/raymarch.wgsl';
import { Structure } from "./structure";

const numberOfVerticesToDraw = 6;

export class RayMarchQuad {
    quadPositions : GPUBuffer;
    quadColors : GPUBuffer;
    pipeline : GPURenderPipeline;
    mvpUniformBuffer : GPUBuffer;
    inverseVpUniformBuffer : GPUBuffer;
    cameraPosBuffer : GPUBuffer;
    uniformBindGroup : GPUBindGroup;

    atomsCount : number;
    atomsBuffer : GPUBuffer;
    atomsBindGroup : GPUBindGroup;

    atomDrawLimitBuffer : GPUBuffer;
    drawSettingsBindGroup : GPUBindGroup;
    
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

        this.atomsCount = 0;
        this.atomsBuffer = device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        this.atomsBindGroup = device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(1),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.atomsBuffer,
                    }
                },
            ]
        });

        this.atomDrawLimitBuffer = device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.drawSettingsBindGroup = device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(2),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.atomDrawLimitBuffer,
                    }
                },
            ]
        });
    }

    public LoadAtoms(device: GPUDevice, structure: Structure) {
        let tree: KdTree = new KdTree(structure.atoms);
        this.atomsCount = tree.tree.length;
        this.atomsBuffer = device.createBuffer({
            size: tree.tree.length*4*4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        let atomPositions: Float32Array = new Float32Array(tree.tree.length*4);
        for (let i = 0; i < tree.tree.length; i++) {
            const atom = tree.tree[i];
            atomPositions[i*4+0] = atom[0];
            atomPositions[i*4+1] = atom[1];
            atomPositions[i*4+2] = atom[2];
            atomPositions[i*4+3] = atom[3];
        }
        device.queue.writeBuffer(this.atomsBuffer, 0, atomPositions.buffer);
        this.atomsBindGroup = device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(1),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.atomsBuffer,
                    }
                },
            ]
        });
    }

    public Draw(device: GPUDevice, renderPass : GPURenderPassEncoder, mvpMatrix: mat4, inverseVpMatrix: mat4, cameraPos: vec3, percentageShown: number, drawStartPosition: number) {
        const maxDrawnAmount = 300;
        device.queue.writeBuffer(this.mvpUniformBuffer, 0, mvpMatrix as ArrayBuffer);
        device.queue.writeBuffer(this.inverseVpUniformBuffer, 0, inverseVpMatrix as ArrayBuffer);
        device.queue.writeBuffer(this.cameraPosBuffer, 0, vec4.fromValues(cameraPos[0], cameraPos[1], cameraPos[2], 1.0) as ArrayBuffer);
        let startPos = maxDrawnAmount + (this.atomsCount-maxDrawnAmount-maxDrawnAmount) * drawStartPosition;
        let drawSettings = vec4.fromValues(Math.round(percentageShown*maxDrawnAmount), Math.round(startPos), 1.0, 1.0);
        device.queue.writeBuffer(this.atomDrawLimitBuffer, 0, drawSettings as ArrayBuffer);
        renderPass.setPipeline(this.pipeline);
        renderPass.setBindGroup(0, this.uniformBindGroup);
        renderPass.setBindGroup(1, this.atomsBindGroup);
        renderPass.setBindGroup(2, this.drawSettingsBindGroup);
        renderPass.setVertexBuffer(0, this.quadPositions);
        renderPass.setVertexBuffer(1, this.quadColors);
        renderPass.draw(numberOfVerticesToDraw);
    }
}