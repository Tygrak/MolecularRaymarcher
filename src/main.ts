import { InitGPU, CreateGPUBuffer, CreateTransforms, CreateViewProjection, CreateAnimation, CreateStructureMesh } from './helper';
import shader from './shader.wgsl';
import "./site.css";
import { vec3, mat4 } from 'gl-matrix';
import $, { data } from 'jquery';
const createCamera = require('3d-view-controls');

const dataSelection = document.getElementById("dataSelection") as HTMLSelectElement;

async function Create3DObject(isAnimation = true) {
    const gpu = await InitGPU();
    const device = gpu.device;

    // create vertex buffers
    const structureMeshData = CreateStructureMesh(dataSelection.value);
    const atomsMeshData = structureMeshData.atoms;
    const atomsNumberOfVertices = atomsMeshData.positions.length / 3;
    const atomsVertexBuffer = CreateGPUBuffer(device, atomsMeshData.positions);
    const atomsColorBuffer = CreateGPUBuffer(device, atomsMeshData.colors);
    
    const bondsMeshData = structureMeshData.bonds;
    const bondsNumberOfVertices = bondsMeshData.positions.length / 3;
    const bondsVertexBuffer = CreateGPUBuffer(device, bondsMeshData.positions);
    const bondsColorBuffer = CreateGPUBuffer(device, bondsMeshData.colors);

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
    camera.zoomMax = 1000;
    camera.zoomMin = 0.01;

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
    
    function draw() {
        if(!isAnimation){
            if(camera.tick()){
                const pMatrix = vp.projectionMatrix;
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


        renderPass.setPipeline(pipeline);
        {
            let numberOfVerticesToDraw = Math.round(atomsNumberOfVertices*percentageShown)-Math.round(atomsNumberOfVertices*percentageShown)%3;
            renderPass.setVertexBuffer(0, atomsVertexBuffer);
            renderPass.setVertexBuffer(1, atomsColorBuffer);
            renderPass.setBindGroup(0, uniformBindGroup);
            //renderPass.draw(atomsNumberOfVertices);
            renderPass.draw(numberOfVerticesToDraw);
        }
        {
            let numberOfVerticesToDraw = Math.round(bondsNumberOfVertices*percentageShown)-Math.round(bondsNumberOfVertices*percentageShown)%3;
            renderPass.setVertexBuffer(0, bondsVertexBuffer);
            renderPass.setVertexBuffer(1, bondsColorBuffer);
            renderPass.setBindGroup(0, uniformBindGroup);
            //renderPass.draw(bondsNumberOfVertices);
            renderPass.draw(numberOfVerticesToDraw);
        }
        renderPass.end();

        device.queue.submit([commandEncoder.finish()]);
    }

    let sliderPercentageShown = document.getElementById("sliderPercentageShown") as HTMLInputElement;
    sliderPercentageShown.oninput = (e) => {
        percentageShown = parseFloat(sliderPercentageShown.value)/100;
    };

    CreateAnimation(draw, rotation, isAnimation);
}

let is_animation = false;
Create3DObject(is_animation);
$('#id-radio input:radio').on('click', function(){
    let val = $('input[name="options"]:checked').val();
    is_animation = val === 'animation'?true:false;
    Create3DObject(is_animation);
});

dataSelection.oninput = (e) => {
    Create3DObject(is_animation);
};

window.addEventListener('resize', function(){
    Create3DObject(is_animation);
});



