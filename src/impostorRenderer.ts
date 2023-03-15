import { mat4, vec3, vec4 } from "gl-matrix";
import { Atom } from "./atom";
import { GetAtomType } from "./atomDatabase";
import { CreateGPUBuffer } from "./helper";
import { KdTree } from "./kdtree";
import { CreateQuadGeometry } from "./meshHelpers";
import shader from './shaders/impostor.wgsl';
import { Structure } from "./structure";

export class ImpostorRenderer {
    atomsCount : number = 1;
    quadPositions : GPUBuffer;
    quadColors : GPUBuffer;
    quadInfos : GPUBuffer;
    pipeline : GPURenderPipeline;
    mvpUniformBuffer : GPUBuffer;
    vUniformBuffer : GPUBuffer;
    cameraPosBuffer : GPUBuffer;
    uniformBindGroup : GPUBindGroup;

    atomDrawLimitBuffer : GPUBuffer;
    drawSettingsBindGroup : GPUBindGroup;
    
    constructor (device: GPUDevice, format: GPUTextureFormat) {
        let quad = CreateQuadGeometry(new Atom(0, 0, 0, "C", "C"));
        this.quadPositions = CreateGPUBuffer(device, quad.positions);
        this.quadColors = CreateGPUBuffer(device, quad.color);
        this.quadInfos = CreateGPUBuffer(device, quad.info);

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
                    },
                    {
                        arrayStride: 4*3,
                        attributes: [{
                            shaderLocation: 2,
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

        this.vUniformBuffer = device.createBuffer({
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
                        buffer: this.vUniformBuffer,
                    }
                },
                {
                    binding: 2,
                    resource: {
                        buffer: this.cameraPosBuffer,
                    }
                },
            ]
        });

        this.atomDrawLimitBuffer = device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.drawSettingsBindGroup = device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(1),
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
        this.atomsCount = structure.atoms.length;
        let positions = new Float32Array(this.atomsCount*6*3);
        let colors = new Float32Array(this.atomsCount*6*3);
        let infos = new Float32Array(this.atomsCount*6*3);
        for (let i = 0; i < structure.atoms.length; i++) {
            const atom = structure.atoms[i];
            let quad = CreateQuadGeometry(atom);
            for (let vertex = 0; vertex < 6; vertex++) {
                positions[vertex*3+i*18+0] = atom.x;
                positions[vertex*3+i*18+1] = atom.y;
                positions[vertex*3+i*18+2] = atom.z;
                colors[vertex*3+i*18+0] = quad.color[vertex*3+0];
                colors[vertex*3+i*18+1] = quad.color[vertex*3+1];
                colors[vertex*3+i*18+2] = quad.color[vertex*3+2];
                infos[vertex*3+i*18+0] = quad.info[vertex*3+0];
                infos[vertex*3+i*18+1] = quad.info[vertex*3+1];
                infos[vertex*3+i*18+2] = quad.info[vertex*3+2];
            }
        }
        this.quadPositions = CreateGPUBuffer(device, positions);
        this.quadColors = CreateGPUBuffer(device, colors);
        this.quadInfos = CreateGPUBuffer(device, infos);
    }

    public Draw(device: GPUDevice, renderPass : GPURenderPassEncoder, mvpMatrix: mat4, vMatrix: mat4, cameraPos: vec3, percentageShown: number, sizeScale: number) {
        let drawSettings = vec4.fromValues(Math.round(percentageShown*this.atomsCount), Math.round(0), 1.0, sizeScale);

        device.queue.writeBuffer(this.mvpUniformBuffer, 0, mvpMatrix as ArrayBuffer);
        device.queue.writeBuffer(this.vUniformBuffer, 0, vMatrix as ArrayBuffer);
        device.queue.writeBuffer(this.cameraPosBuffer, 0, vec4.fromValues(cameraPos[0], cameraPos[1], cameraPos[2], 1.0) as ArrayBuffer);

        device.queue.writeBuffer(this.atomDrawLimitBuffer, 0, drawSettings as ArrayBuffer);

        renderPass.setPipeline(this.pipeline);
        renderPass.setBindGroup(0, this.uniformBindGroup);
        renderPass.setBindGroup(1, this.drawSettingsBindGroup);
        renderPass.setVertexBuffer(0, this.quadPositions);
        renderPass.setVertexBuffer(1, this.quadColors);
        renderPass.setVertexBuffer(2, this.quadInfos);
        renderPass.draw(this.atomsCount*6);
    }
}