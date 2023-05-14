import { mat4, vec3 } from "gl-matrix";
import { CreateGPUBuffer } from "./helper";
import { CreateBondGeometry, CreateLineGeometry, CreateSphereGeometry } from "./meshHelpers";
import { Octree } from "./octree";
import shaderGrid from './shaders/grid.wgsl';

const GridScale = 0.035;

export class OctreeMesh {
    device: GPUDevice;
    pipeline: GPURenderPipeline;
    octree: Octree;
    positions: Float32Array;
    colors: Float32Array;
    
    initializedBuffers: boolean = false;
    linesNumberOfVertices: number = -1;
    linesVertexBuffer: GPUBuffer;
    linesColorBuffer: GPUBuffer;
    mvpUniformBuffer: GPUBuffer;
    uniformBindGroup: GPUBindGroup;

    constructor (device: GPUDevice, format: GPUTextureFormat, octree: Octree) {
        this.device = device;
        this.octree = octree;
        let t0 = performance.now();
        let positions = [];
        for (let i = 0; i < octree.bins.length; i++) {
            const bin = octree.bins[i];
            if (!bin.isLeaf) {
                positions.push(...CreateLineGeometry(vec3.fromValues(bin.min[0], bin.min[1], bin.min[2]), vec3.fromValues(bin.max[0], bin.min[1], bin.min[2]), GridScale, 1).positions);
                positions.push(...CreateLineGeometry(vec3.fromValues(bin.min[0], bin.min[1], bin.min[2]), vec3.fromValues(bin.min[0], bin.max[1], bin.min[2]), GridScale, 1).positions);
                positions.push(...CreateLineGeometry(vec3.fromValues(bin.min[0], bin.min[1], bin.min[2]), vec3.fromValues(bin.min[0], bin.min[1], bin.max[2]), GridScale, 1).positions);

                positions.push(...CreateLineGeometry(vec3.fromValues(bin.max[0], bin.min[1], bin.min[2]), vec3.fromValues(bin.max[0], bin.max[1], bin.min[2]), GridScale, 1).positions);
                positions.push(...CreateLineGeometry(vec3.fromValues(bin.max[0], bin.min[1], bin.min[2]), vec3.fromValues(bin.max[0], bin.min[1], bin.max[2]), GridScale, 1).positions);

                positions.push(...CreateLineGeometry(vec3.fromValues(bin.min[0], bin.max[1], bin.min[2]), vec3.fromValues(bin.max[0], bin.max[1], bin.min[2]), GridScale, 1).positions);
                positions.push(...CreateLineGeometry(vec3.fromValues(bin.min[0], bin.max[1], bin.min[2]), vec3.fromValues(bin.min[0], bin.max[1], bin.max[2]), GridScale, 1).positions);
                
                positions.push(...CreateLineGeometry(vec3.fromValues(bin.min[0], bin.min[1], bin.max[2]), vec3.fromValues(bin.max[0], bin.min[1], bin.max[2]), GridScale, 1).positions);
                positions.push(...CreateLineGeometry(vec3.fromValues(bin.min[0], bin.min[1], bin.max[2]), vec3.fromValues(bin.min[0], bin.max[1], bin.max[2]), GridScale, 1).positions);

                positions.push(...CreateLineGeometry(vec3.fromValues(bin.max[0], bin.max[1], bin.min[2]), vec3.fromValues(bin.max[0], bin.max[1], bin.max[2]), GridScale, 1).positions);
                positions.push(...CreateLineGeometry(vec3.fromValues(bin.max[0], bin.min[1], bin.max[2]), vec3.fromValues(bin.max[0], bin.max[1], bin.max[2]), GridScale, 1).positions);
                positions.push(...CreateLineGeometry(vec3.fromValues(bin.min[0], bin.max[1], bin.max[2]), vec3.fromValues(bin.max[0], bin.max[1], bin.max[2]), GridScale, 1).positions);
            }
        }
        this.positions = new Float32Array(positions);
        this.colors = new Float32Array(this.positions.length).map((v) => 0.5);
        let t1 = performance.now();

        this.initializedBuffers = true;
        this.linesNumberOfVertices = this.positions.length / 3;
        this.linesVertexBuffer = CreateGPUBuffer(device, this.positions);
        this.linesColorBuffer = CreateGPUBuffer(device, this.colors);

        this.pipeline = device.createRenderPipeline({
            layout:'auto',
            vertex: {
                module: device.createShaderModule({
                    code: shaderGrid
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
                    code: shaderGrid
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
                format: "depth32float",
                depthWriteEnabled: true,
                depthCompare: "less"
            }
        });

        this.mvpUniformBuffer = device.createBuffer({
            size: 64,
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
                }
            ]
        });
    }

    public DrawStructure(renderPass: GPURenderPassEncoder, mvpMatrix: mat4) {
        if (!this.initializedBuffers) {
            console.log("warning! tried drawing using uninitialized octree mesh");
            return;
        }
        let numberOfVerticesToDraw = this.linesNumberOfVertices;
        this.device.queue.writeBuffer(this.mvpUniformBuffer, 0, mvpMatrix as ArrayBuffer);
        renderPass.setPipeline(this.pipeline);
        renderPass.setBindGroup(0, this.uniformBindGroup);
        renderPass.setVertexBuffer(0, this.linesVertexBuffer);
        renderPass.setVertexBuffer(1, this.linesColorBuffer);
        renderPass.draw(numberOfVerticesToDraw);
    }
}