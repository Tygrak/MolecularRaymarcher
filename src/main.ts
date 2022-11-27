import { InitGPU, CreateGPUBuffer, CreateTransforms, CreateViewProjection} from './helper';
import shader from './shader.wgsl';
import "./site.css";
import { vec3, mat4 } from 'gl-matrix';
import $, { data } from 'jquery';
import { Structure } from './structure';
import { RayMarchQuad } from './rayMarchQuad';
import { Atom } from './atom';
import { KdTree } from './kdtree';
import { TestKdTrees } from './tests';

const createCamera = require('3d-view-controls');

const dataSelection = document.getElementById("dataSelection") as HTMLSelectElement;
const visualizationSelection = document.getElementById("visualizationSelection") as HTMLSelectElement;
const sliderPercentageShown = document.getElementById("sliderPercentageShown") as HTMLInputElement;
const sliderRaymarchingDrawnAmount = document.getElementById("raymarchingDrawnAmount") as HTMLInputElement;
const sliderRaymarchingStartPosition = document.getElementById("raymarchingStartPosition") as HTMLInputElement;

let structure1cqw : Structure;
let structure1aon : Structure;
let isAnimation = false;

let rayMarchQuad : RayMarchQuad;

async function Initialize() {
    const gpu = await InitGPU();
    const device = gpu.device;

    // create vertex buffers
    structure1cqw = new Structure("1cqw");
    structure1cqw.InitializeBuffers(device);

    rayMarchQuad = new RayMarchQuad(device, gpu.format);
    rayMarchQuad.LoadAtoms(device, structure1cqw);

    let kTree = new KdTree(structure1cqw.atoms);
    console.log(kTree);
    //console.log(kTree.Nearest(new Atom(5, 5, 5, "C", "C")));
    //todo: fix test
    //TestKdTrees();

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
            if(isAnimation){
                rotation[0] += 0.01;
                rotation[1] += 0.01;
                rotation[2] += 0.01;
            } else{
                rotation = [0, 0, 0];
            }
            draw();
            requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    function draw() {
        const pMatrix = vp.projectionMatrix;
        if(!isAnimation){
            if(camera.tick()){
                vMatrix = camera.matrix;
                mat4.multiply(vpMatrix, pMatrix, vMatrix);
            }
        }

        CreateTransforms(modelMatrix, [0,0,0], rotation);
        mat4.multiply(mvpMatrix, vpMatrix, modelMatrix);
        device.queue.writeBuffer(uniformBuffer, 0, mvpMatrix as ArrayBuffer);
        textureView = gpu.context.getCurrentTexture().createView();
        renderPassDescription.colorAttachments[0].view = textureView;
        const commandEncoder = device.createCommandEncoder();
        const renderPass = commandEncoder.beginRenderPass(renderPassDescription as GPURenderPassDescriptor);

        if (visualizationSelection.value == "basic") {
            renderPass.setPipeline(pipeline);
            renderPass.setBindGroup(0, uniformBindGroup);
            if (dataSelection.value != "1cqw") {
                structure1aon.DrawStructure(renderPass, percentageShown);
            } else {
                structure1cqw.DrawStructure(renderPass, percentageShown);
            }
        } else {
            let inverseVp = mat4.create();
            mat4.invert(inverseVp, vpMatrix);
            let drawAmount = parseFloat(sliderRaymarchingDrawnAmount.value)/100;
            let drawStart = parseFloat(sliderRaymarchingStartPosition.value)/100;
            rayMarchQuad.Draw(device, renderPass, mvpMatrix, inverseVp, camera.eye, drawAmount, drawStart);
        }
        renderPass.end();

        device.queue.submit([commandEncoder.finish()]);
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
        }
    };

    CreateAnimation(draw);
}

Initialize();
$('#id-radio input:radio').on('click', function(){
    let val = $('input[name="options"]:checked').val();
    isAnimation = val === 'animation'?true:false;
});

window.addEventListener('resize', function(){
    //todo: make better
    Initialize();
});



