import { InitGPU, CreateGPUBuffer, CreateTransforms, CreateViewProjection, CreateTimestampBuffer} from './helper';
import shader from './shaders/shader.wgsl';
import "./site.css";
import { vec3, mat4 } from 'gl-matrix';
import $, { data } from 'jquery';
import { Structure } from './structure';
import { RayMarchQuad } from './rayMarchQuad';
import { Atom } from './atom';
import { KdTree } from './kdtree';
import { TestKdTrees } from './tests';
import { ImpostorRenderer } from './impostorRenderer';
import { RayMarchOctreeQuad } from './rayMarchOctreeQuad';

const createCamera = require('3d-view-controls');

const dataSelection = document.getElementById("dataSelection") as HTMLSelectElement;
const visualizationSelection = document.getElementById("visualizationSelection") as HTMLSelectElement;
const sliderPercentageShown = document.getElementById("sliderPercentageShown") as HTMLInputElement;
const sliderRaymarchingDrawnAmount = document.getElementById("raymarchingDrawnAmount") as HTMLInputElement;
const sliderRaymarchingStartPosition = document.getElementById("raymarchingStartPosition") as HTMLInputElement;
const sliderImpostorSizeScale = document.getElementById("impostorSizeScale") as HTMLInputElement;
const canvasSizeCheckbox = document.getElementById("canvasSizeCheckbox") as HTMLInputElement;

const fpsCounterElement = document.getElementById("fpsCounter") as HTMLParagraphElement;

let structure1cqw : Structure;
let structure1aon : Structure;
let renderMs = 0.1;

let rayMarchQuadOct1cqw : RayMarchOctreeQuad;
let rayMarchQuadOct1aon : RayMarchOctreeQuad;
let rayMarchQuad1cqw : RayMarchQuad;
let rayMarchQuad1aon : RayMarchQuad;
let impostorRenderer1cqw : ImpostorRenderer;
let impostorRenderer1aon : ImpostorRenderer;

async function Initialize() {
    const gpu = await InitGPU(canvasSizeCheckbox.checked);
    const device = gpu.device;

    let timestampBuffers: {
        queryBuffer: GPUBuffer;
        querySet: GPUQuerySet;
        capacity: number;
    };
    if (gpu.timestampsEnabled) {
        timestampBuffers = CreateTimestampBuffer(device, 8);
    }

    TestKdTrees();

    // create vertex buffers
    structure1cqw = new Structure("1cqw");
    structure1cqw.InitializeBuffers(device);

    rayMarchQuad1cqw = new RayMarchQuad(device, gpu.format);
    rayMarchQuad1cqw.LoadAtoms(device, structure1cqw);
    
    rayMarchQuadOct1cqw = new RayMarchOctreeQuad(device, gpu.format);
    rayMarchQuadOct1cqw.LoadAtoms(device, structure1cqw);

    impostorRenderer1cqw = new ImpostorRenderer(device, gpu.format);
    impostorRenderer1cqw.LoadAtoms(device, structure1cqw);

    let kTree = new KdTree(structure1cqw.atoms);
    console.log(kTree);
    
    let percentageShown = 1;
 
    const pipeline = device.createRenderPipeline({
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
                    format: gpu.format as GPUTextureFormat
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

    // create uniform data
    const modelMatrix = mat4.create();
    const mvpMatrix = mat4.create();
    let vMatrix = mat4.create();
    let vpMatrix = mat4.create();
    let cameraPosition = vec3.fromValues(0, 5, 45);

    console.log(dataSelection.value);
    if (dataSelection.value != "1cqw") {
        cameraPosition = vec3.fromValues(125, 31.5, 10.5);
    }
    const vp = CreateViewProjection(gpu.canvas.width/gpu.canvas.height, cameraPosition);
    vpMatrix = vp.viewProjectionMatrix;

    // add rotation and camera:
    let rotation = vec3.fromValues(0, 0, 0);       
    var camera = createCamera(gpu.canvas, vp.cameraOption);
    console.log(camera);

    // create uniform buffer and layout
    const uniformBuffer = device.createBuffer({
        size: 64,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const uniformBindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{
            binding: 0,
            resource: {
                buffer: uniformBuffer,
                offset: 0,
                size: 64
            }
        }]
    });

    let textureView = gpu.context.getCurrentTexture().createView();
    const depthTexture = device.createTexture({
        size: [gpu.canvas.width, gpu.canvas.height, 1],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT
    });
    const renderPassDescription = {
        colorAttachments: [{
            view: textureView,
            clearValue: { r: 0.2, g: 0.247, b: 0.314, a: 1.0 }, //background color
            loadValue: { r: 0.2, g: 0.247, b: 0.314, a: 1.0 }, 
            loadOp: 'clear',
            storeOp: 'store'
        }],
        depthStencilAttachment: {
            view: depthTexture.createView(),
            depthClearValue: 1.0,
            depthLoadOp:'clear',
            depthStoreOp: "store",
        }
    };

    function CreateAnimation(draw : any) {
        function step() {
            rotation = [0, 0, 0];
            draw();
            requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    let previousFrameDeltaTimesMs: number[] = new Array<number>(60).fill(15);
    let frameId = 0;

    function draw() {
        frameId++;
        const pMatrix = vp.projectionMatrix;
        if(camera.tick()){
            vMatrix = camera.matrix;
            mat4.multiply(vpMatrix, pMatrix, vMatrix);
        }

        CreateTransforms(modelMatrix, [0,0,0], rotation);
        mat4.multiply(mvpMatrix, vpMatrix, modelMatrix);
        device.queue.writeBuffer(uniformBuffer, 0, mvpMatrix as ArrayBuffer);
        textureView = gpu.context.getCurrentTexture().createView();
        renderPassDescription.colorAttachments[0].view = textureView;
        const commandEncoder = device.createCommandEncoder();
        if (gpu.timestampsEnabled) {
            commandEncoder.writeTimestamp(timestampBuffers.querySet, 0);
        }

        const renderPass = commandEncoder.beginRenderPass(renderPassDescription as GPURenderPassDescriptor);
        if (visualizationSelection.value == "basic") {
            renderPass.setPipeline(pipeline);
            renderPass.setBindGroup(0, uniformBindGroup);
            if (dataSelection.value != "1cqw") {
                structure1aon.DrawStructure(renderPass, percentageShown);
            } else {
                structure1cqw.DrawStructure(renderPass, percentageShown);
            }
        } else if (visualizationSelection.value == "impostor") {
            const vp = CreateViewProjection(gpu.canvas.width/gpu.canvas.height, camera.eye, camera.view.center, camera.view.up);
            let vMatrix = mat4.clone(vp.viewMatrix);
            let drawAmount = parseFloat(sliderRaymarchingDrawnAmount.value)/100;
            let sizeScale = parseFloat(sliderImpostorSizeScale.value);
            if (dataSelection.value == "1cqw") {
                impostorRenderer1cqw.Draw(device, renderPass, vpMatrix, vMatrix, camera.eye, drawAmount, sizeScale);

                renderPass.setPipeline(pipeline);
                renderPass.setBindGroup(0, uniformBindGroup);
                structure1cqw.DrawStructure(renderPass, 1, true);
            } else if (dataSelection.value == "1aon") {
                impostorRenderer1aon.Draw(device, renderPass, vpMatrix, vMatrix, camera.eye, drawAmount, sizeScale);

                renderPass.setPipeline(pipeline);
                renderPass.setBindGroup(0, uniformBindGroup);
                structure1aon.DrawStructure(renderPass, 1, true);
            }
        } else if (visualizationSelection.value == "raymarch") {
            let inverseVp = mat4.create();
            mat4.invert(inverseVp, vpMatrix);
            let drawAmount = parseFloat(sliderRaymarchingDrawnAmount.value)/100;
            let drawStart = parseFloat(sliderRaymarchingStartPosition.value)/100;
            rayMarchQuad1cqw.DrawRaymarch(device, renderPass, mvpMatrix, inverseVp, camera.eye, drawAmount, drawStart);
        } else if (visualizationSelection.value == "raymarchoctree") {
            let inverseVp = mat4.create();
            mat4.invert(inverseVp, vpMatrix);
            let drawAmount = parseFloat(sliderRaymarchingDrawnAmount.value)/100;
            let drawStart = parseFloat(sliderRaymarchingStartPosition.value)/100;
            let sizeScale = parseFloat(sliderImpostorSizeScale.value);
            if (dataSelection.value == "1cqw") {
                rayMarchQuadOct1cqw.DrawRaymarch(device, renderPass, mvpMatrix, inverseVp, camera.eye, drawAmount, drawStart, sizeScale);
            } else if (dataSelection.value == "1aon") {
                rayMarchQuadOct1aon.DrawRaymarch(device, renderPass, mvpMatrix, inverseVp, camera.eye, drawAmount, drawStart, sizeScale);
            }
        } else if (visualizationSelection.value == "raytrace") {
            let inverseVp = mat4.create();
            mat4.invert(inverseVp, vpMatrix);
            let drawAmount = parseFloat(sliderRaymarchingDrawnAmount.value)/100;
            let drawStart = parseFloat(sliderRaymarchingStartPosition.value)/100;
            if (dataSelection.value == "1cqw") {
                rayMarchQuad1cqw.DrawRaytrace(device, renderPass, mvpMatrix, inverseVp, camera.eye, drawAmount, drawStart);
            }/* else if (dataSelection.value == "1aon") {
                rayMarchQuad1aon.DrawRaytrace(device, renderPass, mvpMatrix, inverseVp, camera.eye, drawAmount, drawStart);
            }*/
        }
        renderPass.end();

        if (gpu.timestampsEnabled) {
            commandEncoder.writeTimestamp(timestampBuffers.querySet, 1);
            commandEncoder.resolveQuerySet(timestampBuffers.querySet, 0, 2, timestampBuffers.queryBuffer, 0);
        }
        
        device.queue.submit([commandEncoder.finish()]);
        
        //read query buffer with timestamps
        if (gpu.timestampsEnabled) {
            const size = timestampBuffers.queryBuffer.size;
            const gpuReadBuffer = device.createBuffer({size, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });  const copyEncoder = device.createCommandEncoder();
            copyEncoder.copyBufferToBuffer(timestampBuffers.queryBuffer, 0, gpuReadBuffer, 0, size);  const copyCommands = copyEncoder.finish();
            device.queue.submit([copyCommands]);
            const currFrame = frameId;
            gpuReadBuffer.mapAsync(GPUMapMode.READ).finally(() => {
                let arrayBuffer = gpuReadBuffer.getMappedRange();
                const timingsNanoseconds = new BigInt64Array(arrayBuffer);
                const frameTimeMs = Number((timingsNanoseconds[1]-timingsNanoseconds[0])/BigInt(1000))/1000;
                previousFrameDeltaTimesMs[currFrame%previousFrameDeltaTimesMs.length] = frameTimeMs;
                fpsCounterElement.innerText = (previousFrameDeltaTimesMs.reduce((acc, c) => acc+c)/previousFrameDeltaTimesMs.length).toFixed(3) + "ms";
            });
        } else {
            fpsCounterElement.innerText = "timestamps :(";
        }
    }

    sliderPercentageShown.oninput = (e) => {
        percentageShown = parseFloat(sliderPercentageShown.value)/100;
    };

    dataSelection.oninput = (e) => {
        console.log(dataSelection.value);
        cameraPosition = vec3.fromValues(0, 5, 45);
        if (dataSelection.value != "1cqw") {
            cameraPosition = vec3.fromValues(125, 31.5, 10.5);
        }
        if (dataSelection.value == "1aon" && structure1aon == undefined) {
            structure1aon = new Structure("1aon");
            structure1aon.InitializeBuffers(device);
            impostorRenderer1aon = new ImpostorRenderer(device, gpu.format);
            impostorRenderer1aon.LoadAtoms(device, structure1aon);
            
            let t0 = performance.now();
            //rayMarchQuad1aon = new RayMarchQuad(device, gpu.format);
            //rayMarchQuad1aon.LoadAtoms(device, structure1aon);
            let t1 = performance.now();
            //console.log("Loading data for raytrace+creating kdtree: " + (t1-t0) + "ms");

            t0 = performance.now();
            rayMarchQuadOct1aon = new RayMarchOctreeQuad(device, gpu.format);
            rayMarchQuadOct1aon.LoadAtoms(device, structure1aon);
            t1 = performance.now();
            console.log("Loading data for raymarch+creating quadtree: " + (t1-t0) + "ms");
        }
    };

    CreateAnimation(draw);
}

Initialize();

window.addEventListener('resize', function(){
    //todo: make better, don't vomit errors, just resize things gracefully
    Initialize();
});

canvasSizeCheckbox.addEventListener('change', function(){
    Initialize();
});

