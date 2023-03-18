import { InitGPU, CreateGPUBuffer, CreateTransforms, CreateViewProjection, CreateTimestampBuffer, LoadData} from './helper';
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
import { Benchmarker } from './benchmark';

const createCamera = require('3d-view-controls');

const dataSelection = document.getElementById("dataSelection") as HTMLSelectElement;
const visualizationSelection = document.getElementById("visualizationSelection") as HTMLSelectElement;
const debugSelection = document.getElementById("debugSelection") as HTMLSelectElement;
const sliderPercentageShown = document.getElementById("sliderPercentageShown") as HTMLInputElement;
const sliderDebugA = document.getElementById("raymarchingDrawnAmount") as HTMLInputElement;
const sliderDebugB = document.getElementById("raymarchingStartPosition") as HTMLInputElement;
const sliderImpostorSizeScale = document.getElementById("impostorSizeScale") as HTMLInputElement;
const sliderKSmoothminScale = document.getElementById("kSmoothminScale") as HTMLInputElement;
const canvasSizeCheckbox = document.getElementById("canvasSizeCheckbox") as HTMLInputElement;
const allowResetRaymarchCheckbox = document.getElementById("allowResetRaymarchCheckbox") as HTMLInputElement;
const addCloseNeighborsToCellsCheckbox = document.getElementById("addCloseNeighborsToCellsCheckbox") as HTMLInputElement;
const getRaymarchCellNeighborsCheckbox = document.getElementById("getRaymarchNeighborsCheckbox") as HTMLInputElement;
const makeIrregularOctreeCheckbox = document.getElementById("makeIrregularOctreeCheckbox") as HTMLInputElement;
const automaticOctreeSizeCheckbox = document.getElementById("automaticOctreeSizeCheckbox") as HTMLInputElement;
const renderOnlyMovementCheckbox = document.getElementById("renderOnlyMovementCheckbox") as HTMLInputElement;
const alwaysFullRenderCheckbox = document.getElementById("alwaysFullRenderCheckbox") as HTMLInputElement;
const octreeLayersSlider = document.getElementById("octreeLayers") as HTMLInputElement;
const dataLoadButton = document.getElementById("dataLoadButton") as HTMLButtonElement;
const dataFileInput = document.getElementById("dataFileInput") as HTMLInputElement;
const benchmarkButton = document.getElementById("benchmarkButton") as HTMLButtonElement;
const regenerateOctreeButton = document.getElementById("regenerateOctreeButton") as HTMLButtonElement;
const shaderFileInput = document.getElementById("shaderFileInput") as HTMLInputElement;
//const shaderUtilitiesFileInput = document.getElementById("shaderUtilitiesFileInput") as HTMLInputElement;
const shaderLoadButton = document.getElementById("shaderLoadButton") as HTMLButtonElement;

const fpsCounterElement = document.getElementById("fpsCounter") as HTMLParagraphElement;

let structure1cqw : Structure;
let structure1aon : Structure;
let structureLoaded : Structure;

let rayMarchQuadOct1cqw : RayMarchOctreeQuad;
let rayMarchQuadOct1aon : RayMarchOctreeQuad;
let rayMarchQuadOctLoaded : RayMarchOctreeQuad;
let impostorRenderer1cqw : ImpostorRenderer;
let impostorRenderer1aon : ImpostorRenderer;
let impostorRendererLoaded : ImpostorRenderer;

let device: GPUDevice;

let renderDirty: boolean = true;
let fullRender: boolean = true;
let nextFullRenderTime: number = 10000;

async function Initialize() {
    const gpu = await InitGPU(canvasSizeCheckbox.checked);
    device = gpu.device;

    let timestampBuffers: {
        queryBuffer: GPUBuffer;
        querySet: GPUQuerySet;
        capacity: number;
    };
    if (gpu.timestampsEnabled) {
        timestampBuffers = CreateTimestampBuffer(device, 8);
    }

    //TestKdTrees();

    // create vertex buffers
    structure1cqw = new Structure(require('./data/1cqw.pdb'));
    structure1cqw.InitializeBuffers(device);
    
    rayMarchQuadOct1cqw = new RayMarchOctreeQuad(device, gpu.format);
    rayMarchQuadOct1cqw.LoadAtoms(device, structure1cqw);

    impostorRenderer1cqw = new ImpostorRenderer(device, gpu.format);
    impostorRenderer1cqw.LoadAtoms(device, structure1cqw);

    let kTree = new KdTree(structure1cqw.atoms);
    console.log(kTree);
    
    let percentageShown = 1;
 
    const basicPipeline = device.createRenderPipeline({
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

    const basicUniformBindGroup = device.createBindGroup({
        layout: basicPipeline.getBindGroupLayout(0),
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
    let depthTexture = device.createTexture({
        size: [gpu.canvas.width, gpu.canvas.height, 1],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT
    });
    let renderPassDescription = {
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
    Reinitialize();

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
        if (!document.hasFocus() && !benchmarker.running) {
            return;
        }

        const pMatrix = vp.projectionMatrix;
        if (camera.tick()) {
            vMatrix = camera.matrix;
            mat4.multiply(vpMatrix, pMatrix, vMatrix);
            renderDirty = true;
            queueFullRender();
        }
        if (nextFullRenderTime < performance.now()) {
            nextFullRenderTime = 100000000;
            renderDirty = true;
            fullRender = true;
        }
        if (!renderDirty && renderOnlyMovementCheckbox.checked && !benchmarker.running) {
            return;
        }
        if (alwaysFullRenderCheckbox.checked) {
            fullRender = true;
        }
        frameId++;

        let cameraPosition = camera.eye;
        if (benchmarker.running) {
            cameraPosition = benchmarker.GetFramePosition();
            const bViewMatrix = benchmarker.GetFrameViewMatrix();
            mat4.multiply(vpMatrix, pMatrix, bViewMatrix);
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
            renderPass.setPipeline(basicPipeline);
            renderPass.setBindGroup(0, basicUniformBindGroup);
            if (dataSelection.value == "1cqw") {
                structure1cqw.DrawStructure(renderPass, percentageShown);
            } else if (dataSelection.value == "1aon") {
                structure1aon.DrawStructure(renderPass, percentageShown);
            } else if (structureLoaded != undefined && dataSelection.value == "dataFile") {
                structureLoaded.DrawStructure(renderPass, percentageShown);
            }
        } else if (visualizationSelection.value == "impostor") {
            const vp = CreateViewProjection(gpu.canvas.width/gpu.canvas.height, cameraPosition, vec3.fromValues(0, 0, 0), vec3.fromValues(0, 1, 0));
            let vMatrix = mat4.clone(vp.viewMatrix);
            let drawAmount = parseFloat(sliderDebugA.value)/100;
            let sizeScale = parseFloat(sliderImpostorSizeScale.value);
            if (dataSelection.value == "1cqw") {
                impostorRenderer1cqw.Draw(device, renderPass, vpMatrix, vMatrix, cameraPosition, drawAmount, sizeScale);

                renderPass.setPipeline(basicPipeline);
                renderPass.setBindGroup(0, basicUniformBindGroup);
                structure1cqw.DrawStructure(renderPass, 1, true);
            } else if (dataSelection.value == "1aon") {
                impostorRenderer1aon.Draw(device, renderPass, vpMatrix, vMatrix, cameraPosition, drawAmount, sizeScale);

                renderPass.setPipeline(basicPipeline);
                renderPass.setBindGroup(0, basicUniformBindGroup);
                structure1aon.DrawStructure(renderPass, 1, true);
            } else if (structureLoaded != undefined && dataSelection.value == "dataFile") {
                impostorRendererLoaded.Draw(device, renderPass, vpMatrix, vMatrix, cameraPosition, drawAmount, sizeScale);

                renderPass.setPipeline(basicPipeline);
                renderPass.setBindGroup(0, basicUniformBindGroup);
                structureLoaded.DrawStructure(renderPass, 1, true);
            }
        } else if (visualizationSelection.value == "raymarchoctree") {
            let inverseVp = mat4.create();
            mat4.invert(inverseVp, vpMatrix);
            let drawAmount = parseFloat(sliderDebugA.value)/100;
            let drawStart = parseFloat(sliderDebugB.value)/100;
            let sizeScale = parseFloat(sliderImpostorSizeScale.value);
            let kSmoothminScale = parseFloat(sliderKSmoothminScale.value);
            let debugMode = parseFloat(debugSelection.value);
            if (dataSelection.value == "1cqw") {
                rayMarchQuadOct1cqw.debugMode = debugMode;
                rayMarchQuadOct1cqw.allowResetRaymarch = allowResetRaymarchCheckbox.checked ? 1 : 0;
                rayMarchQuadOct1cqw.getRaymarchCellNeighbors = getRaymarchCellNeighborsCheckbox.checked ? 1 : 0;
                rayMarchQuadOct1cqw.kSmoothminScale = kSmoothminScale;
                rayMarchQuadOct1cqw.DrawRaymarch(device, renderPass, mvpMatrix, inverseVp, cameraPosition, fullRender, drawAmount, drawStart, sizeScale);
                //rayMarchQuadOct1cqw.DrawGrid(device, renderPass, mvpMatrix);
            } else if (dataSelection.value == "1aon") {
                rayMarchQuadOct1aon.debugMode = debugMode;
                rayMarchQuadOct1aon.allowResetRaymarch = allowResetRaymarchCheckbox.checked ? 1 : 0;
                rayMarchQuadOct1aon.getRaymarchCellNeighbors = getRaymarchCellNeighborsCheckbox.checked ? 1 : 0;
                rayMarchQuadOct1aon.kSmoothminScale = kSmoothminScale;
                rayMarchQuadOct1aon.DrawRaymarch(device, renderPass, mvpMatrix, inverseVp, cameraPosition, fullRender, drawAmount, drawStart, sizeScale);
                //rayMarchQuadOct1aon.DrawGrid(device, renderPass, mvpMatrix);
            } else if (structureLoaded != undefined && dataSelection.value == "dataFile") {
                rayMarchQuadOctLoaded.debugMode = debugMode;
                rayMarchQuadOctLoaded.allowResetRaymarch = allowResetRaymarchCheckbox.checked ? 1 : 0;
                rayMarchQuadOctLoaded.getRaymarchCellNeighbors = getRaymarchCellNeighborsCheckbox.checked ? 1 : 0;
                rayMarchQuadOctLoaded.kSmoothminScale = kSmoothminScale;
                rayMarchQuadOctLoaded.DrawRaymarch(device, renderPass, mvpMatrix, inverseVp, cameraPosition, fullRender, drawAmount, drawStart, sizeScale);
                //rayMarchQuadOctLoaded.DrawGrid(device, renderPass, mvpMatrix);
            }
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
            const gpuReadBuffer = device.createBuffer({size, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ});  const copyEncoder = device.createCommandEncoder();
            copyEncoder.copyBufferToBuffer(timestampBuffers.queryBuffer, 0, gpuReadBuffer, 0, size);  const copyCommands = copyEncoder.finish();
            device.queue.submit([copyCommands]);
            const currFrame = frameId;
            gpuReadBuffer.mapAsync(GPUMapMode.READ).finally(() => {
                let arrayBuffer = gpuReadBuffer.getMappedRange();
                const timingsNanoseconds = new BigInt64Array(arrayBuffer);
                const frameTimeMs = Number((timingsNanoseconds[1]-timingsNanoseconds[0])/BigInt(1000))/1000;
                previousFrameDeltaTimesMs[currFrame%previousFrameDeltaTimesMs.length] = frameTimeMs;
                fpsCounterElement.innerText = (previousFrameDeltaTimesMs.reduce((acc, c) => acc+c)/previousFrameDeltaTimesMs.length).toFixed(3) + "ms";
                if (benchmarker.running) {
                    benchmarker.SubmitFrameTime(frameTimeMs);
                }
            });
        } else {
            fpsCounterElement.innerText = "timestamps :(";
        }
        renderDirty = false;
        fullRender = false;
        benchmarker.EndFrame();
    }

    sliderPercentageShown.oninput = (e) => {
        percentageShown = parseFloat(sliderPercentageShown.value)/100;
    };
    
    function Reinitialize() {
        textureView = gpu.context.getCurrentTexture().createView();
        depthTexture = device.createTexture({
            size: [gpu.canvas.width, gpu.canvas.height, 1],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
        renderPassDescription = {
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
    }

    window.addEventListener('resize', function(){
        Reinitialize();
    });

    canvasSizeCheckbox.addEventListener('change', function(){
        //todo
        Reinitialize();
    });

    dataSelection.oninput = (e) => {
        console.log(dataSelection.value);
        cameraPosition = vec3.fromValues(0, 5, 45);
        if (dataSelection.value != "1cqw") {
            cameraPosition = vec3.fromValues(125, 31.5, 10.5);
        }
        if (dataSelection.value == "1aon" && structure1aon == undefined) {
            let t0 = performance.now();
            structure1aon = new Structure(require('./data/1aon.pdb'));
            structure1aon.InitializeBuffers(device);
            impostorRenderer1aon = new ImpostorRenderer(device, gpu.format);
            impostorRenderer1aon.LoadAtoms(device, structure1aon);
            
            rayMarchQuadOct1aon = new RayMarchOctreeQuad(device, gpu.format);
            rayMarchQuadOct1aon.makeIrregularOctree = makeIrregularOctreeCheckbox.checked;
            regenerateOctree();
            let t1 = performance.now();
            console.log("Loading data for raymarch+creating octree: " + (t1-t0) + "ms");
        }
        if (dataSelection.value == "Loaded" && structureLoaded != undefined) {
            let t0 = performance.now();
            impostorRenderer1aon = new ImpostorRenderer(device, gpu.format);
            impostorRenderer1aon.LoadAtoms(device, structure1aon);
            
            rayMarchQuadOctLoaded = new RayMarchOctreeQuad(device, gpu.format);
            rayMarchQuadOctLoaded.makeIrregularOctree = makeIrregularOctreeCheckbox.checked;
            rayMarchQuadOctLoaded.LoadAtoms(device, structureLoaded);
            let t1 = performance.now();
            console.log("Loading data for raymarch+creating octree: " + (t1-t0) + "ms");
        }
    };

    dataLoadButton.onclick = (e) => {
        if (dataFileInput.files == null || dataFileInput.files?.length == 0) {
            console.log("No file selected!");
            return;
        }
        
        let t0 = performance.now();
        LoadData(dataFileInput.files[0], (text: string) => {
            structureLoaded = new Structure(text);
            structureLoaded.InitializeBuffers(device);
            let sizeScale = parseFloat(sliderImpostorSizeScale.value);
            let kSmoothminScale = parseFloat(sliderKSmoothminScale.value);
            impostorRendererLoaded = new ImpostorRenderer(device, gpu.format);
            impostorRendererLoaded.LoadAtoms(device, structureLoaded);
            rayMarchQuadOctLoaded = new RayMarchOctreeQuad(device, gpu.format, currShaderCode);
            rayMarchQuadOctLoaded.octreeLayers = parseInt(octreeLayersSlider.value);
            rayMarchQuadOctLoaded.makeIrregularOctree = makeIrregularOctreeCheckbox.checked;
            rayMarchQuadOctLoaded.automaticOctreeSize = automaticOctreeSizeCheckbox.checked;
            rayMarchQuadOctLoaded.octreeMargins = 0.2+sizeScale+kSmoothminScale*1.005;
            rayMarchQuadOctLoaded.LoadAtoms(device, structureLoaded);
            let t1 = performance.now();
            console.log("Loading data from file (" + dataFileInput.files![0].name + "): " + (t1-t0) + "ms");
            dataSelection.value = "dataFile";
            queueFullRender();
        });
    };

    let benchmarker = new Benchmarker();
    benchmarkButton.onclick = (e) => {
        if (!gpu.timestampsEnabled) {
            console.log("Can't benchmark without timestamps :(");
            return;
        }
        benchmarker.Start();
    }

    let currShaderCode = "";
    shaderLoadButton.onclick = (e) => {
        if (shaderFileInput.files == null || shaderFileInput.files?.length == 0) {
            console.log("No file selected!");
            return;
        }
        
        let t0 = performance.now();
        LoadData(shaderFileInput.files[0], (text: string) => {
            currShaderCode = text;
            rayMarchQuadOctLoaded = new RayMarchOctreeQuad(device, gpu.format, text);
            rayMarchQuadOct1aon = new RayMarchOctreeQuad(device, gpu.format, text);
            rayMarchQuadOct1cqw = new RayMarchOctreeQuad(device, gpu.format, text);
            regenerateOctree();
            let t1 = performance.now();
            console.log("Loading shader from file (" + shaderFileInput.files![0].name + "): " + (t1-t0) + "ms");
        });
    };

    CreateAnimation(draw);
}

Initialize();

addCloseNeighborsToCellsCheckbox.addEventListener('change', function(){
    if (addCloseNeighborsToCellsCheckbox.checked) {
        let sizeScale = parseFloat(sliderImpostorSizeScale.value);
        let kSmoothminScale = parseFloat(sliderKSmoothminScale.value);
        rayMarchQuadOct1cqw.octreeMargins = 0.0+sizeScale+kSmoothminScale*1.0;
        rayMarchQuadOct1cqw.LoadAtoms(device, structure1cqw);
    } else {
        rayMarchQuadOct1cqw.octreeMargins = 0.0;
        rayMarchQuadOct1cqw.LoadAtoms(device, structure1cqw);
    }
});

function queueFullRender() {
    renderDirty = true;
    nextFullRenderTime = performance.now()+0.25;
}

function regenerateOctree() {
    let sizeScale = parseFloat(sliderImpostorSizeScale.value);
    let kSmoothminScale = parseFloat(sliderKSmoothminScale.value);
    rayMarchQuadOct1cqw.octreeLayers = parseInt(octreeLayersSlider.value);
    rayMarchQuadOct1cqw.automaticOctreeSize = automaticOctreeSizeCheckbox.checked;
    rayMarchQuadOct1cqw.makeIrregularOctree = makeIrregularOctreeCheckbox.checked;
    rayMarchQuadOct1cqw.octreeMargins = 0.2+sizeScale+kSmoothminScale*1.005;
    rayMarchQuadOct1cqw.LoadAtoms(device, structure1cqw);
    if (dataSelection.value == "1aon") {
        rayMarchQuadOct1aon.octreeLayers = parseInt(octreeLayersSlider.value);
        rayMarchQuadOct1aon.makeIrregularOctree = makeIrregularOctreeCheckbox.checked;
        rayMarchQuadOct1aon.automaticOctreeSize = automaticOctreeSizeCheckbox.checked;
        rayMarchQuadOct1aon.octreeMargins = 0.2+sizeScale+kSmoothminScale*1.005;
        rayMarchQuadOct1aon.LoadAtoms(device, structure1aon);
    } else if (structureLoaded != undefined && dataSelection.value == "dataFile") {
        rayMarchQuadOctLoaded.octreeLayers = parseInt(octreeLayersSlider.value);
        rayMarchQuadOctLoaded.makeIrregularOctree = makeIrregularOctreeCheckbox.checked;
        rayMarchQuadOctLoaded.automaticOctreeSize = automaticOctreeSizeCheckbox.checked;
        rayMarchQuadOctLoaded.octreeMargins = 0.2+sizeScale+kSmoothminScale*1.005;
        rayMarchQuadOctLoaded.LoadAtoms(device, structureLoaded);
    }
    queueFullRender();
}

makeIrregularOctreeCheckbox.addEventListener('change', function(){
    regenerateOctree();
});

regenerateOctreeButton.onclick = (e) => {
    regenerateOctree();
}

sliderDebugA.onchange = (e) => {
    queueFullRender();
}
sliderDebugB.onchange = (e) => {
    queueFullRender();
}
debugSelection.onchange = (e) => {
    queueFullRender();
}
sliderImpostorSizeScale.onchange = (e) => {
    queueFullRender();
}
sliderKSmoothminScale.onchange = (e) => {
    queueFullRender();
}

if (document != null) {
    document.addEventListener('keypress', function(keyEvent: KeyboardEvent){
        if (keyEvent.code == "Digit1") {
            debugSelection.value = "0";
        } else if (keyEvent.code == "Digit2") {
            debugSelection.value = "18";
        } else if (keyEvent.code == "Digit3") {
            debugSelection.value = "7";
        } else if (keyEvent.code == "Digit4") {
            debugSelection.value = "1";
        } else if (keyEvent.code == "Digit5") {
            debugSelection.value = "10";
        } else if (keyEvent.code == "Digit6") {
            debugSelection.value = "12";
        } else if (keyEvent.code == "Digit7") {
            debugSelection.value = "20";
        } else if (keyEvent.code == "Digit8") {
            debugSelection.value = "5";
        } else if (keyEvent.code == "Digit9") {
            debugSelection.value = "17";
        } else if (keyEvent.code == "Digit0") {
            debugSelection.value = "24";
        } else if (keyEvent.code == "Minus") {
            debugSelection.value = "21";
        } else if (keyEvent.code == "Equal") {
            debugSelection.value = "22";
        }
        queueFullRender();
    });
}
