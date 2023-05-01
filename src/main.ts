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
import { AxisMesh } from './axisMesh';
import { TextureVisualizeQuad } from './textureVisualizeQuad';

const createCamera = require('3d-view-controls');

const dataSelection = document.getElementById("dataSelection") as HTMLSelectElement;
const visualizationSelection = document.getElementById("visualizationSelection") as HTMLSelectElement;
const smoothminTypeSelection = document.getElementById("smoothminSelection") as HTMLSelectElement;
const debugSelection = document.getElementById("debugSelection") as HTMLSelectElement;
const sliderPercentageShown = document.getElementById("sliderPercentageShown") as HTMLInputElement;
const sliderDebugA = document.getElementById("raymarchingDrawnAmount") as HTMLInputElement;
const sliderDebugB = document.getElementById("raymarchingStartPosition") as HTMLInputElement;
const sliderImpostorSizeScale = document.getElementById("impostorSizeScale") as HTMLInputElement;
const sliderKSmoothminScale = document.getElementById("kSmoothminScale") as HTMLInputElement;
const canvasSizeCheckbox = document.getElementById("canvasSizeCheckbox") as HTMLInputElement;
const allowResetRaymarchCheckbox = document.getElementById("allowResetRaymarchCheckbox") as HTMLInputElement;
const getRaymarchCellNeighborsCheckbox = document.getElementById("getRaymarchNeighborsCheckbox") as HTMLInputElement;
const makeKdOctreeCheckbox = document.getElementById("makeKdOctreeCheckbox") as HTMLInputElement;
const makeIrregularOctreeCheckbox = document.getElementById("makeIrregularOctreeCheckbox") as HTMLInputElement;
const automaticOctreeSizeCheckbox = document.getElementById("automaticOctreeSizeCheckbox") as HTMLInputElement;
const renderOnlyMovementCheckbox = document.getElementById("renderOnlyMovementCheckbox") as HTMLInputElement;
const alwaysFullRenderCheckbox = document.getElementById("alwaysFullRenderCheckbox") as HTMLInputElement;
const highlightMainChainCheckbox = document.getElementById("highlightMainChainCheckbox") as HTMLInputElement;
const cartoonEdgesCheckbox = document.getElementById("cartoonEdgesCheckbox") as HTMLInputElement;
const colorUsingChainCheckbox = document.getElementById("colorUsingChainCheckbox") as HTMLInputElement;
const centerDistanceFadeCheckbox = document.getElementById("centerDistanceFadeCheckbox") as HTMLInputElement;
const raytraceAtomsOptimCheckbox = document.getElementById("raytraceAtomsOptimCheckbox") as HTMLInputElement;
const addDebugColormapCheckbox = document.getElementById("addDebugColormapCheckbox") as HTMLInputElement;
const skipUsingRealHitOptimCheckbox = document.getElementById("skipUsingRealHitOptimCheckbox") as HTMLInputElement;


const octreeLayersSlider = document.getElementById("octreeLayers") as HTMLInputElement;
const sliderLightRotation = document.getElementById("lightRotation") as HTMLInputElement;
const dataLoadButton = document.getElementById("dataLoadButton") as HTMLButtonElement;
const dataFileInput = document.getElementById("dataFileInput") as HTMLInputElement;
const benchmarkButton = document.getElementById("benchmarkButton") as HTMLButtonElement;
const inputBenchmarkDistance = document.getElementById("benchmarkDistance") as HTMLInputElement;
const fixedCanvasXInput = document.getElementById("fixedCanvasX") as HTMLInputElement;
const fixedCanvasYInput = document.getElementById("fixedCanvasY") as HTMLInputElement;

const regenerateOctreeButton = document.getElementById("regenerateOctreeButton") as HTMLButtonElement;
const shaderFileInput = document.getElementById("shaderFileInput") as HTMLInputElement;
const shaderPreprocessorFlagsInput = document.getElementById("preprocessorFlags") as HTMLInputElement;
//const shaderUtilitiesFileInput = document.getElementById("shaderUtilitiesFileInput") as HTMLInputElement;
const shaderLoadButton = document.getElementById("shaderLoadButton") as HTMLButtonElement;

const createUrlButton = document.getElementById("createUrlButton") as HTMLButtonElement;
const urlResultElement = document.getElementById("urlResult") as HTMLParagraphElement;

const fpsCounterElement = document.getElementById("fpsCounter") as HTMLParagraphElement;

const inputCAtomColorR = document.getElementById("CAtomColorR") as HTMLInputElement;
const inputCAtomColorG = document.getElementById("CAtomColorG") as HTMLInputElement;
const inputCAtomColorB = document.getElementById("CAtomColorB") as HTMLInputElement;
const inputNAtomColorR = document.getElementById("NAtomColorR") as HTMLInputElement;
const inputNAtomColorG = document.getElementById("NAtomColorG") as HTMLInputElement;
const inputNAtomColorB = document.getElementById("NAtomColorB") as HTMLInputElement;
const inputOAtomColorR = document.getElementById("OAtomColorR") as HTMLInputElement;
const inputOAtomColorG = document.getElementById("OAtomColorG") as HTMLInputElement;
const inputOAtomColorB = document.getElementById("OAtomColorB") as HTMLInputElement;
const inputSAtomColorR = document.getElementById("SAtomColorR") as HTMLInputElement;
const inputSAtomColorG = document.getElementById("SAtomColorG") as HTMLInputElement;
const inputSAtomColorB = document.getElementById("SAtomColorB") as HTMLInputElement;
const inputBgColorR = document.getElementById("BgColorR") as HTMLInputElement;
const inputBgColorG = document.getElementById("BgColorG") as HTMLInputElement;
const inputBgColorB = document.getElementById("BgColorB") as HTMLInputElement;

let structure1cqw: Structure;
let structure1aon: Structure;
let structureLoaded: Structure;

let rayMarchQuadOct1cqw: RayMarchOctreeQuad;
let rayMarchQuadOct1aon: RayMarchOctreeQuad;
let rayMarchQuadOctLoaded: RayMarchOctreeQuad;
let impostorRenderer1cqw: ImpostorRenderer;
let impostorRenderer1aon: ImpostorRenderer;
let impostorRendererLoaded: ImpostorRenderer;
let axisMesh: AxisMesh;

let device: GPUDevice;

let renderDirty: boolean = true;
let fullRender: boolean = true;
let nextFullRenderTime: number = 10000;

let drawAxisMesh: boolean = false;

//todo split application from rendering stuff -- somehow make all the ui be separate, create a core module that does everything
async function Initialize() {
    LoadUrlParameters();
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
    
    let t0 = performance.now();
    rayMarchQuadOct1cqw = new RayMarchOctreeQuad(device, gpu.format);
    let t1 = performance.now();
    console.log("Initializing raymarch octree quad: " + (t1-t0) + "ms");
    t0 = performance.now();
    rayMarchQuadOct1cqw.LoadAtoms(device, structure1cqw);
    t1 = performance.now();
    console.log("Creating octree and buffers: " + (t1-t0) + "ms");

    impostorRenderer1cqw = new ImpostorRenderer(device, gpu.format);
    impostorRenderer1cqw.LoadAtoms(device, structure1cqw);

    axisMesh = new AxisMesh(device, gpu.format);

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
            format: "depth32float",
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
    let vp = CreateViewProjection(gpu.canvas.width/gpu.canvas.height, cameraPosition);
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
        label: "DepthTexture",
        size: [gpu.canvas.width, gpu.canvas.height, 1],
        format: "depth32float",
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
    });
    let depthTextureView = depthTexture.createView({label: "DepthTextureView"});
    let renderPassDescription = {
        colorAttachments: [{
            view: textureView,
            clearValue: { r: 0.2, g: 0.247, b: 0.314, a: 1.0 }, //background color
            loadValue: { r: 0.2, g: 0.247, b: 0.314, a: 1.0 }, 
            loadOp: 'clear',
            storeOp: 'store'
        }],
        depthStencilAttachment: {
            view: depthTextureView,
            depthClearValue: 1.0,
            depthLoadOp:'clear',
            depthStoreOp: 'store',
        }
    };
    let textureQuadPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [{
            view: textureView,
            clearValue: { r: 0.2, g: 0.247, b: 0.314, a: 1.0 },
            loadOp: 'clear',
            storeOp: 'store'
        }],
    };
    let textureVisualizeQuad: TextureVisualizeQuad;
    //let depthSampler = device.createSampler(GPUSamplerDescriptor)
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
            if (drawAxisMesh) {
                axisMesh.DrawStructure(renderPass, mvpMatrix);
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
            if (drawAxisMesh) {
                axisMesh.DrawStructure(renderPass, mvpMatrix);
            }
        } else if (visualizationSelection.value == "raymarchoctree") {
            let inverseVp = mat4.create();
            mat4.invert(inverseVp, vpMatrix);
            let drawAmount = parseFloat(sliderDebugA.value)/100;
            let drawStart = parseFloat(sliderDebugB.value)/100;
            let sizeScale = parseFloat(sliderImpostorSizeScale.value);
            let kSmoothminScale = parseFloat(sliderKSmoothminScale.value);
            let debugMode = parseFloat(debugSelection.value);
            let lightRotation = parseFloat(sliderLightRotation.value)*6.28;
            let lightDirection = vec3.normalize(vec3.create(), vec3.fromValues(0.05+Math.sin(lightRotation*2), 1*(0.3+(lightRotation/6-0.5)*2), 0.075+Math.cos(lightRotation*2)));
            if (dataSelection.value == "1cqw") {
                rayMarchQuadOct1cqw.debugMode = debugMode;
                rayMarchQuadOct1cqw.allowResetRaymarch = allowResetRaymarchCheckbox.checked ? 1 : 0;
                rayMarchQuadOct1cqw.getRaymarchCellNeighbors = getRaymarchCellNeighborsCheckbox.checked ? 1 : 0;
                rayMarchQuadOct1cqw.kSmoothminScale = kSmoothminScale;
                rayMarchQuadOct1cqw.lightDirection = lightDirection;
                rayMarchQuadOct1cqw.DrawRaymarch(device, renderPass, mvpMatrix, inverseVp, cameraPosition, fullRender, drawAmount, drawStart, sizeScale);
                //rayMarchQuadOct1cqw.DrawGrid(device, renderPass, mvpMatrix);
            } else if (dataSelection.value == "1aon") {
                rayMarchQuadOct1aon.debugMode = debugMode;
                rayMarchQuadOct1aon.allowResetRaymarch = allowResetRaymarchCheckbox.checked ? 1 : 0;
                rayMarchQuadOct1aon.getRaymarchCellNeighbors = getRaymarchCellNeighborsCheckbox.checked ? 1 : 0;
                rayMarchQuadOct1aon.kSmoothminScale = kSmoothminScale;
                rayMarchQuadOct1aon.lightDirection = lightDirection;
                rayMarchQuadOct1aon.DrawRaymarch(device, renderPass, mvpMatrix, inverseVp, cameraPosition, fullRender, drawAmount, drawStart, sizeScale);
                //rayMarchQuadOct1aon.DrawGrid(device, renderPass, mvpMatrix);
            } else if (structureLoaded != undefined && dataSelection.value == "dataFile") {
                rayMarchQuadOctLoaded.debugMode = debugMode;
                rayMarchQuadOctLoaded.allowResetRaymarch = allowResetRaymarchCheckbox.checked ? 1 : 0;
                rayMarchQuadOctLoaded.getRaymarchCellNeighbors = getRaymarchCellNeighborsCheckbox.checked ? 1 : 0;
                rayMarchQuadOctLoaded.kSmoothminScale = kSmoothminScale;
                rayMarchQuadOctLoaded.lightDirection = lightDirection;
                rayMarchQuadOctLoaded.DrawRaymarch(device, renderPass, mvpMatrix, inverseVp, cameraPosition, fullRender, drawAmount, drawStart, sizeScale);
                //rayMarchQuadOctLoaded.DrawGrid(device, renderPass, mvpMatrix);
            }
            axisMesh.DrawStructure(renderPass, mvpMatrix);
        }
        renderPass.end();
        //todo:
        /*const depthRenderPass = commandEncoder.beginRenderPass(textureQuadPassDescriptor as GPURenderPassDescriptor);
        {
            textureVisualizeQuad.Draw(depthRenderPass);
        }
        depthRenderPass.end();*/

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
            fpsCounterElement.innerText = "timestamps not enabled :(";
        }
        renderDirty = false;
        fullRender = false;
        benchmarker.EndFrame();
    }

    sliderPercentageShown.oninput = (e) => {
        percentageShown = parseFloat(sliderPercentageShown.value)/100;
    };
    
    function Reinitialize() {
        vp = CreateViewProjection(gpu.canvas.width/gpu.canvas.height, cameraPosition);
        vpMatrix = vp.viewProjectionMatrix;
        textureView = gpu.context.getCurrentTexture().createView({label: "MainTextureView"});
        depthTexture = device.createTexture({
            label: "DepthTexture",
            size: [gpu.canvas.width, gpu.canvas.height, 1],
            format: "depth32float",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
        });
        depthTextureView = depthTexture.createView({label: "DepthTextureView"});
        renderPassDescription = {
            colorAttachments: [{
                view: textureView,
                clearValue: { r: 0.2, g: 0.247, b: 0.314, a: 1.0 }, //background color
                loadValue: { r: 0.2, g: 0.247, b: 0.314, a: 1.0 }, 
                loadOp: 'clear',
                storeOp: 'store'
            }],
            depthStencilAttachment: {
                view: depthTextureView,
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store',
            }
        };
        textureQuadPassDescriptor = {
            colorAttachments: [{
                view: textureView,
                clearValue: { r: 0.2, g: 0.247, b: 0.314, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store'
            }],
        };
        //textureVisualizeQuad = new TextureVisualizeQuad(device, gpu.format, depthTextureView);
    }

    window.addEventListener('resize', function(){
        Reinitialize();
    });

    canvasSizeCheckbox.addEventListener('change', function(){
        if (canvasSizeCheckbox.checked) {
            gpu.canvas.classList.add("fixedSize");
            gpu.canvas.width = parseFloat(fixedCanvasXInput.value);
            gpu.canvas.height = parseFloat(fixedCanvasYInput.value);
        } else {
            gpu.canvas.classList.remove("fixedSize");
        }
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
            impostorRenderer1aon = new ImpostorRenderer(device, gpu.format);
            impostorRenderer1aon.LoadAtoms(device, structure1aon);
            
            rayMarchQuadOct1aon = new RayMarchOctreeQuad(device, gpu.format);
            rayMarchQuadOct1aon.makeKdesqueOctree = makeKdOctreeCheckbox.checked;
            rayMarchQuadOct1aon.makeIrregularOctree = makeIrregularOctreeCheckbox.checked;
            regenerateOctree();
            ReloadShaders();
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
        queueFullRender();
    };

    dataLoadButton.onclick = (e) => {
        if (dataFileInput.files == null || dataFileInput.files?.length == 0) {
            console.log("No file selected!");
            return;
        }
        
        let t0 = performance.now();
        LoadData(dataFileInput.files[0], (text: string) => {
            structureLoaded = new Structure(text);
            let sizeScale = parseFloat(sliderImpostorSizeScale.value);
            let kSmoothminScale = parseFloat(sliderKSmoothminScale.value);
            impostorRendererLoaded = new ImpostorRenderer(device, gpu.format);
            impostorRendererLoaded.LoadAtoms(device, structureLoaded);
            rayMarchQuadOctLoaded = new RayMarchOctreeQuad(device, gpu.format, currShaderCode);
            rayMarchQuadOctLoaded.octreeLayers = parseInt(octreeLayersSlider.value);
            rayMarchQuadOctLoaded.makeKdesqueOctree = makeKdOctreeCheckbox.checked;
            rayMarchQuadOctLoaded.makeIrregularOctree = makeIrregularOctreeCheckbox.checked;
            rayMarchQuadOctLoaded.automaticOctreeSize = automaticOctreeSizeCheckbox.checked;
            rayMarchQuadOctLoaded.octreeMargins = 0.2+sizeScale+kSmoothminScale*1.005;
            rayMarchQuadOctLoaded.LoadAtoms(device, structureLoaded);
            ReloadShaders();
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
        if (dataSelection.value == "1cqw") {
            benchmarker.distanceFromOrigin = 50;
            benchmarker.InitializePositions();
            benchmarker.moleculeName = "1cqw";
        } else if (dataSelection.value == "1aon") {
            benchmarker.distanceFromOrigin = 250;
            benchmarker.InitializePositions();
            benchmarker.moleculeName = "1aon";
        } else {
            benchmarker.distanceFromOrigin = vec3.distance(camera.eye, camera.center);
            benchmarker.InitializePositions();
            benchmarker.moleculeName = "loaded";
            if (dataFileInput.files != null && dataFileInput.files.length > 0) {
                benchmarker.moleculeName = dataFileInput.files![0].name;
                if (dataFileInput.files![0].name.indexOf(".pdb") != -1) {
                    benchmarker.moleculeName = dataFileInput.files![0].name.split(".pdb")[0];
                }
            }
        }
        benchmarker.canvasSizeX = gpu.canvas.width;
        benchmarker.canvasSizeY = gpu.canvas.height;
        let inputDistance = parseFloat(inputBenchmarkDistance.value);
        if (inputDistance > 2) {
            benchmarker.distanceFromOrigin = inputDistance;
            benchmarker.InitializePositions();
        }
        benchmarker.Start();
    }

    let currShaderCode = "";
    shaderLoadButton.onclick = (e) => {
        if (shaderFileInput.files == null || shaderFileInput.files?.length == 0) {
            ReloadShaders();
            return;
        }
        
        LoadData(shaderFileInput.files[0], (text: string) => {
            console.log("Loading shader from file (" + shaderFileInput.files![0].name + ")");
            currShaderCode = text;
            ReloadShaders();
        });
    };

    function ReloadShaders() {
        let t0 = performance.now();
        let preprocessFlags: string[] = [];
        let additionalFlags = shaderPreprocessorFlagsInput.value.split(/[,.;/ ]/);
        preprocessFlags.push(...additionalFlags);
        if (!highlightMainChainCheckbox.checked) {
            preprocessFlags.push("DontHighlightMainChain");
        }
        if (cartoonEdgesCheckbox.checked) {
            preprocessFlags.push("UseCartoonEdges");
        }
        if (colorUsingChainCheckbox.checked) {
            preprocessFlags.push("UseColorByChainNumber");
        }
        if (centerDistanceFadeCheckbox.checked) {
            preprocessFlags.push("UseCenterDistanceFade");
        }
        if (!raytraceAtomsOptimCheckbox.checked) {
            preprocessFlags.push("DontRaytraceAtoms");
        }
        if (addDebugColormapCheckbox.checked) {
            preprocessFlags.push("ShowDebugColorMap");
        }
        if (!skipUsingRealHitOptimCheckbox.checked) {
            preprocessFlags.push("DontSkipUsingRealHits");
        }
        preprocessFlags.push(smoothminTypeSelection.value);
        let atomColorC = vec3.fromValues(parseFloat(inputCAtomColorR.value), parseFloat(inputCAtomColorG.value), parseFloat(inputCAtomColorB.value));
        let atomColorN = vec3.fromValues(parseFloat(inputNAtomColorR.value), parseFloat(inputNAtomColorG.value), parseFloat(inputNAtomColorB.value));
        let atomColorO = vec3.fromValues(parseFloat(inputOAtomColorR.value), parseFloat(inputOAtomColorG.value), parseFloat(inputOAtomColorB.value));
        let atomColorS = vec3.fromValues(parseFloat(inputSAtomColorR.value), parseFloat(inputSAtomColorG.value), parseFloat(inputSAtomColorB.value));
        let bgColor = vec3.fromValues(parseFloat(inputBgColorR.value), parseFloat(inputBgColorG.value), parseFloat(inputBgColorB.value));
        atomColorC[0] = Number.isFinite(atomColorC[0]) ? atomColorC[0] : 0.5;
        atomColorC[1] = Number.isFinite(atomColorC[1]) ? atomColorC[1] : 0.5;
        atomColorC[2] = Number.isFinite(atomColorC[2]) ? atomColorC[2] : 0.5;
        atomColorN[0] = Number.isFinite(atomColorN[0]) ? atomColorN[0] : 0.5;
        atomColorN[1] = Number.isFinite(atomColorN[1]) ? atomColorN[1] : 0.5;
        atomColorN[2] = Number.isFinite(atomColorN[2]) ? atomColorN[2] : 0.5;
        atomColorO[0] = Number.isFinite(atomColorO[0]) ? atomColorO[0] : 0.5;
        atomColorO[1] = Number.isFinite(atomColorO[1]) ? atomColorO[1] : 0.5;
        atomColorO[2] = Number.isFinite(atomColorO[2]) ? atomColorO[2] : 0.5;
        atomColorS[0] = Number.isFinite(atomColorS[0]) ? atomColorS[0] : 0.5;
        atomColorS[1] = Number.isFinite(atomColorS[1]) ? atomColorS[1] : 0.5;
        atomColorS[2] = Number.isFinite(atomColorS[2]) ? atomColorS[2] : 0.5;
        bgColor[0] = Number.isFinite(bgColor[0]) ? bgColor[0] : 0.15;
        bgColor[1] = Number.isFinite(bgColor[1]) ? bgColor[1] : 0.00;
        bgColor[2] = Number.isFinite(bgColor[2]) ? bgColor[2] : 0.15;
        //todo: make use of only one raymarchquadoct object and just swap buffers
        if (rayMarchQuadOctLoaded != undefined) {
            rayMarchQuadOctLoaded.LoadCustomAtomColors(atomColorC, atomColorN, atomColorO, atomColorS, bgColor);
            rayMarchQuadOctLoaded.shaderPreprocessFlags = preprocessFlags;
            rayMarchQuadOctLoaded.ReloadShader(device, currShaderCode);
        }
        if (rayMarchQuadOct1aon != undefined) {
            rayMarchQuadOct1aon.LoadCustomAtomColors(atomColorC, atomColorN, atomColorO, atomColorS, bgColor);
            rayMarchQuadOct1aon.shaderPreprocessFlags = preprocessFlags;
            rayMarchQuadOct1aon.ReloadShader(device, currShaderCode);
        }
        if (rayMarchQuadOct1cqw != undefined) {
            rayMarchQuadOct1cqw.LoadCustomAtomColors(atomColorC, atomColorN, atomColorO, atomColorS, bgColor);
            rayMarchQuadOct1cqw.shaderPreprocessFlags = preprocessFlags;
            rayMarchQuadOct1cqw.ReloadShader(device, currShaderCode);
        }
        let t1 = performance.now();
        queueFullRender();
        console.log("Reloading shaders: " + (t1-t0) + "ms");
    }

    
    if (document != null) {
        document.addEventListener('keypress', function(keyEvent: KeyboardEvent){
            if (keyEvent.code == "Digit1") {
                debugSelection.value = "0";
            } else if (keyEvent.code == "Digit2") {
                debugSelection.value = "1";
            } else if (keyEvent.code == "Digit3") {
                debugSelection.value = "2";
            } else if (keyEvent.code == "Digit4") {
                debugSelection.value = "3";
            } else if (keyEvent.code == "Digit5") {
                debugSelection.value = "101";
            } else if (keyEvent.code == "Digit6") {
                debugSelection.value = "103";
            } else if (keyEvent.code == "Digit7") {
                debugSelection.value = "104";
            } else if (keyEvent.code == "Digit8") {
                debugSelection.value = "113";
            } else if (keyEvent.code == "Digit9") {
                debugSelection.value = "105";
            } else if (keyEvent.code == "Digit0") {
                debugSelection.value = "107";
            } else if (keyEvent.code == "Minus") {
                debugSelection.value = "130";
            } else if (keyEvent.code == "Equal") {
                debugSelection.value = "131";
            } else if (keyEvent.code == "Numpad1") {
                let distance = vec3.distance(camera.eye, camera.center);
                camera.eye = [0, 0, 0];
                camera.up = [0, 1, 0];
                camera.center = [0, 0, -distance];
            } else if (keyEvent.code == "Numpad3") {
                let distance = vec3.distance(camera.eye, camera.center);
                camera.eye = [0, 0, 0];
                camera.up = [0, 1, 0];
                camera.center = [-distance, 0, 0];
            } else if (keyEvent.code == "Numpad5") {
                let distance = vec3.distance(camera.eye, camera.center);
                camera.eye = [0, 0, 0];
                camera.up = [0, 1, 0];
                camera.center = [0, 5, 45];
            } else if (keyEvent.code == "Numpad7") {
                let distance = vec3.distance(camera.eye, camera.center);
                camera.eye = [0, 0, 0];
                camera.up = [0, 0, 1];
                camera.center = [0, distance, 0];
            } else if (keyEvent.code == "Numpad9") {
                let distance = vec3.distance(camera.eye, camera.center);
                camera.eye = [0, 0, 0];
                camera.up = [0, 0, 1];
                camera.center = [0, -distance, 0];
            } else if (keyEvent.code == "NumpadAdd") {
                let distance = vec3.distance(camera.eye, camera.center);
                let normDir = vec3.normalize(vec3.create(), camera.eye);
                if (Math.abs(camera.eye[0])+Math.abs(camera.eye[1])+Math.abs(camera.eye[2]) < 0.01) {
                    normDir = vec3.normalize(vec3.create(), camera.center);
                }
                let p = vec3.scale(vec3.create(), normDir, distance-5);
                camera.eye = [0, 0, 0];
                camera.up = camera.up;
                camera.center = [p[0], p[1], p[2]];
            } else if (keyEvent.code == "NumpadSubtract") {
                let distance = vec3.distance(camera.eye, camera.center);
                let normDir = vec3.normalize(vec3.create(), camera.eye);
                if (Math.abs(camera.eye[0])+Math.abs(camera.eye[1])+Math.abs(camera.eye[2]) < 0.01) {
                    normDir = vec3.normalize(vec3.create(), camera.center);
                }
                let p = vec3.scale(vec3.create(), normDir, distance+5);
                camera.eye = [0, 0, 0];
                camera.up = camera.up;
                camera.center = [p[0], p[1], p[2]];
            }
            queueFullRender();
        });
    }

    CreateAnimation(draw);
}

Initialize();

function queueFullRender() {
    //renderDirty = true;
    if (alwaysFullRenderCheckbox.checked) {
        nextFullRenderTime = performance.now()+0.25;
    } else {
        nextFullRenderTime = performance.now()+1.0;
    }
}

function regenerateOctree() {
    let sizeScale = parseFloat(sliderImpostorSizeScale.value);
    let kSmoothminScale = parseFloat(sliderKSmoothminScale.value);
    rayMarchQuadOct1cqw.octreeLayers = parseInt(octreeLayersSlider.value);
    rayMarchQuadOct1cqw.automaticOctreeSize = automaticOctreeSizeCheckbox.checked;
    rayMarchQuadOct1cqw.makeKdesqueOctree = makeKdOctreeCheckbox.checked;
    rayMarchQuadOct1cqw.makeIrregularOctree = makeIrregularOctreeCheckbox.checked;
    rayMarchQuadOct1cqw.octreeMargins = 0.2+sizeScale+kSmoothminScale*1.005;
    rayMarchQuadOct1cqw.LoadAtoms(device, structure1cqw);
    if (dataSelection.value == "1aon") {
        rayMarchQuadOct1aon.octreeLayers = parseInt(octreeLayersSlider.value);
        rayMarchQuadOct1aon.makeKdesqueOctree = makeKdOctreeCheckbox.checked;
        rayMarchQuadOct1aon.makeIrregularOctree = makeIrregularOctreeCheckbox.checked;
        rayMarchQuadOct1aon.automaticOctreeSize = automaticOctreeSizeCheckbox.checked;
        rayMarchQuadOct1aon.octreeMargins = 0.2+sizeScale+kSmoothminScale*1.005;
        rayMarchQuadOct1aon.LoadAtoms(device, structure1aon);
    } else if (structureLoaded != undefined && dataSelection.value == "dataFile") {
        rayMarchQuadOctLoaded.octreeLayers = parseInt(octreeLayersSlider.value);
        rayMarchQuadOctLoaded.makeKdesqueOctree = makeKdOctreeCheckbox.checked;
        rayMarchQuadOctLoaded.makeIrregularOctree = makeIrregularOctreeCheckbox.checked;
        rayMarchQuadOctLoaded.automaticOctreeSize = automaticOctreeSizeCheckbox.checked;
        rayMarchQuadOctLoaded.octreeMargins = 0.2+sizeScale+kSmoothminScale*1.005;
        rayMarchQuadOctLoaded.LoadAtoms(device, structureLoaded);
    }
    queueFullRender();
}

function CreateUrlWithParameters() {
    let url = window.location.href;
    if (url.indexOf("?") != -1) {
        url = url.split("?")[0];
    }
    const urlParams = new URLSearchParams();
    urlParams.append("visMode", visualizationSelection.value);
    urlParams.append("debugMode", debugSelection.value);
    urlParams.append("debugA", sliderDebugA.value);
    urlParams.append("debugB", sliderDebugB.value);
    urlParams.append("atomSize", sliderImpostorSizeScale.value);
    urlParams.append("smoothK", sliderKSmoothminScale.value);
    urlParams.append("lightRot", sliderLightRotation.value);
    urlParams.append("highlightMainChain", highlightMainChainCheckbox.value);
    urlParams.append("allowResetRaymarch", allowResetRaymarchCheckbox.value);
    urlParams.append("makeKdOctree", makeKdOctreeCheckbox.value);
    urlParams.append("makeIrregularOctree", makeIrregularOctreeCheckbox.value);
    urlParams.append("automaticOctreeSize", automaticOctreeSizeCheckbox.value);
    urlParams.append("cartoonEdges", cartoonEdgesCheckbox.value);
    urlParams.append("colorByChainNumber", colorUsingChainCheckbox.value);
    urlParams.append("centerDistanceFade", centerDistanceFadeCheckbox.value);
    urlResultElement.innerText = url+"?"+urlParams.toString();
}

function LoadUrlParameters() {
    const queryString = window.location.search;
    console.log(queryString);
    const urlParams = new URLSearchParams(queryString);
    if (urlParams.has("visMode")) {
        visualizationSelection.value = urlParams.get("visMode")!;
    }
    if (urlParams.has("debugMode")) {
        debugSelection.value = urlParams.get("debugMode")!;
    }
    if (urlParams.has("debugA")) {
        sliderDebugA.value = urlParams.get("debugA")!;
    }
    if (urlParams.has("debugB")) {
        sliderDebugB.value = urlParams.get("debugB")!;
    }
    if (urlParams.has("atomSize")) {
        sliderImpostorSizeScale.value = urlParams.get("atomSize")!;
    }
    if (urlParams.has("smoothK")) {
        sliderKSmoothminScale.value = urlParams.get("smoothK")!;
    }
    if (urlParams.has("lightRot")) {
        sliderLightRotation.value = urlParams.get("lightRot")!;
    }
    if (urlParams.has("highlightMainChain")) {
        highlightMainChainCheckbox.value = urlParams.get("highlightMainChain")!;
    }
    if (urlParams.has("allowResetRaymarch")) {
        allowResetRaymarchCheckbox.value = urlParams.get("allowResetRaymarch")!;
    }
    if (urlParams.has("makeKdOctree")) {
        makeKdOctreeCheckbox.value = urlParams.get("makeKdOctree")!;
    }
    if (urlParams.has("makeIrregularOctree")) {
        makeIrregularOctreeCheckbox.value = urlParams.get("makeIrregularOctree")!;
    }
    if (urlParams.has("automaticOctreeSize")) {
        automaticOctreeSizeCheckbox.value = urlParams.get("automaticOctreeSize")!;
    }
    if (urlParams.has("cartoonEdges")) {
        cartoonEdgesCheckbox.value = urlParams.get("cartoonEdges")!;
    }
    if (urlParams.has("colorByChainNumber")) {
        colorUsingChainCheckbox.value = urlParams.get("colorByChainNumber")!;
    }
    if (urlParams.has("centerDistanceFade")) {
        centerDistanceFadeCheckbox.value = urlParams.get("centerDistanceFade")!;
    }
}

makeKdOctreeCheckbox.addEventListener('change', function(){
    regenerateOctree();
});

makeIrregularOctreeCheckbox.addEventListener('change', function(){
    regenerateOctree();
});

regenerateOctreeButton.onclick = (e) => {
    regenerateOctree();
}

createUrlButton.onclick = (e) => {
    CreateUrlWithParameters();
}

sliderDebugA.oninput = (e) => {
    queueFullRender();
}
sliderDebugB.oninput = (e) => {
    queueFullRender();
}
debugSelection.onchange = (e) => {
    queueFullRender();
}
visualizationSelection.onchange = (e) => {
    if (visualizationSelection.value != "raymarchoctree") {
        structure1cqw.CreateChainMeshes(device);
        if (structure1aon != undefined) {
            structure1aon.CreateChainMeshes(device);
        }
        if (structureLoaded != undefined) {
            structureLoaded.CreateChainMeshes(device);
        }
    }
    queueFullRender();
}
allowResetRaymarchCheckbox.onchange = (e) => {
    queueFullRender();
}
sliderImpostorSizeScale.oninput = (e) => {
    queueFullRender();
}
sliderKSmoothminScale.oninput = (e) => {
    queueFullRender();
}
sliderLightRotation.oninput = (e) => {
    queueFullRender();
}

