import { mat4, vec3, vec4 } from "gl-matrix";
import { GetAtomType } from "./atomDatabase";
import { CreateGPUBuffer } from "./helper";
import { Octree } from "./octree";
import shaderRaymarch from './shaders/raymarchOctree.wgsl';
import { Structure } from "./structure";

const numberOfVerticesToDraw = 6;

class RayPipelineSetup {
    pipeline : GPURenderPipeline;
    mvpUniformBuffer : GPUBuffer;
    inverseVpUniformBuffer : GPUBuffer;
    cameraPosBuffer : GPUBuffer;
    uniformBindGroup : GPUBindGroup;

    atomsCount : number;
    atomsBuffer : GPUBuffer;
    octreeBuffer : GPUBuffer;
    atomsBindGroup : GPUBindGroup;

    atomDrawLimitBuffer : GPUBuffer;
    drawSettingsBindGroup : GPUBindGroup;

    minLimits: vec4 = vec4.fromValues(0, 0, 0, 0);
    maxLimits: vec4 = vec4.fromValues(0, 0, 0, 0);

    constructor (device: GPUDevice, format: GPUTextureFormat, shader: string) {
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
        this.octreeBuffer = device.createBuffer({
            size: 48,
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
                {
                    binding: 1,
                    resource: {
                        buffer: this.octreeBuffer,
                    }
                },
            ]
        });

        this.atomDrawLimitBuffer = device.createBuffer({
            size: 48,
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
        let tree: Octree = new Octree(structure.atoms, 2);
        console.log(tree);
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
        this.minLimits = vec4.fromValues(tree.limits.minLimits[0], tree.limits.minLimits[1], tree.limits.minLimits[2], -1);
        this.maxLimits = vec4.fromValues(tree.limits.maxLimits[0], tree.limits.maxLimits[1], tree.limits.maxLimits[2], -1);
        device.queue.writeBuffer(this.atomsBuffer, 0, atomPositions.buffer);
        this.octreeBuffer = device.createBuffer({
            size: tree.bins.length*8*4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        let binsArray: Float32Array = new Float32Array(tree.bins.length*8);
        for (let i = 0; i < tree.bins.length; i++) {
            const bin = tree.bins[i];
            binsArray.set(bin.AsArray(), i*8);
        }
        device.queue.writeBuffer(this.octreeBuffer, 0, binsArray.buffer);
        this.atomsBindGroup = device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(1),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.atomsBuffer,
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.octreeBuffer,
                    }
                },
            ]
        });
    }
}

export class RayMarchOctreeQuad {
    quadPositions : GPUBuffer;
    quadColors : GPUBuffer;
    pipelineSetupRaymarch : RayPipelineSetup;
    atomsScale: number = 1;
    
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

        this.pipelineSetupRaymarch = new RayPipelineSetup(device, format, shaderRaymarch);
    }

    public LoadAtoms(device: GPUDevice, structure: Structure) {
        this.pipelineSetupRaymarch.LoadAtoms(device, structure);
    }

    private Draw(device: GPUDevice, renderPass : GPURenderPassEncoder, mvpMatrix: mat4, inverseVpMatrix: mat4, cameraPos: vec3, percentageShown: number, drawStartPosition: number, pipelineSetup: RayPipelineSetup) {
        const maxDrawnAmount = 300;
        device.queue.writeBuffer(pipelineSetup.mvpUniformBuffer, 0, mvpMatrix as ArrayBuffer);
        device.queue.writeBuffer(pipelineSetup.inverseVpUniformBuffer, 0, inverseVpMatrix as ArrayBuffer);
        device.queue.writeBuffer(pipelineSetup.cameraPosBuffer, 0, vec4.fromValues(cameraPos[0], cameraPos[1], cameraPos[2], 1.0) as ArrayBuffer);
        let startPos = maxDrawnAmount + (pipelineSetup.atomsCount-maxDrawnAmount-maxDrawnAmount) * drawStartPosition;
        let drawSettingsBuffer = new Float32Array(12);
        drawSettingsBuffer[0] = Math.round(percentageShown*maxDrawnAmount);
        drawSettingsBuffer[1] = Math.round(startPos);
        drawSettingsBuffer[2] = this.atomsScale;
        drawSettingsBuffer[3] = 1.0;
        drawSettingsBuffer.set(pipelineSetup.minLimits, 4);
        drawSettingsBuffer.set(pipelineSetup.maxLimits, 8);
        device.queue.writeBuffer(pipelineSetup.atomDrawLimitBuffer, 0, drawSettingsBuffer);
        renderPass.setPipeline(pipelineSetup.pipeline);
        renderPass.setBindGroup(0, pipelineSetup.uniformBindGroup);
        renderPass.setBindGroup(1, pipelineSetup.atomsBindGroup);
        renderPass.setBindGroup(2, pipelineSetup.drawSettingsBindGroup);
        renderPass.setVertexBuffer(0, this.quadPositions);
        renderPass.setVertexBuffer(1, this.quadColors);
        renderPass.draw(numberOfVerticesToDraw);
    }

    public DrawRaymarch(device: GPUDevice, renderPass : GPURenderPassEncoder, mvpMatrix: mat4, inverseVpMatrix: mat4, cameraPos: vec3, percentageShown: number, drawStartPosition: number, atomsScale: number) {
        this.atomsScale = atomsScale;
        this.Draw(device, renderPass, mvpMatrix, inverseVpMatrix, cameraPos, percentageShown, drawStartPosition, this.pipelineSetupRaymarch);
    }
}