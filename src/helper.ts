import { vec2, vec3, mat4 } from 'gl-matrix';
import { CreateBondGeometry, CreateSphereGeometry, CubeData } from './meshHelpers';
import { LoadData } from './loadData';
import { GetAtomType } from './atomDatabase';

export function CreateStructureMesh() {
    let t0 = performance.now();
    const dataText = require('./data/1cqw.pdb');
    const loaded = LoadData(dataText);
    let t1 = performance.now();
    const atoms = loaded.atoms;
    console.log(loaded.chains);
    //const instanceMesh = CubeData();
    const instanceMesh = CreateSphereGeometry(1, 12, 6);
    let resultAtoms = {positions: new Float32Array(instanceMesh.positions.length*atoms.length), colors: new Float32Array(instanceMesh.colors.length*atoms.length)};
    for (let i = 0; i < atoms.length; i++) {
        const atom = atoms[i];
        let positions = new Float32Array(instanceMesh.positions);
        for (let j = 0; j < positions.length; j++) {
            if (j%3 == 0) {
                positions[j] = (positions[j]/4)*GetAtomType(atom).covalentRadius+atom.x;
            } else if (j%3 == 1) {
                positions[j] = (positions[j]/4)*GetAtomType(atom).covalentRadius+atom.y;
            } else if (j%3 == 2) {
                positions[j] = (positions[j]/4)*GetAtomType(atom).covalentRadius+atom.z;
            }
        }
        let atomColor = atom.GetColor();
        let colors = new Float32Array(instanceMesh.colors);
        for (let j = 0; j < colors.length; j++) {
            colors[j] = atomColor[j%3];
        }
        resultAtoms.positions.set(positions, instanceMesh.positions.length*i);
        resultAtoms.colors.set(colors, instanceMesh.colors.length*i);
    }
    let t2 = performance.now();
    let bondsPositions = [];
    for (let i = 0; i < loaded.chains.length; i++) {
        const bondsMap = loaded.chains[i].bonds;
        const bondsKeys = loaded.chains[i].bondsKeys;
        for (let j = 0; j < bondsKeys.length; j++) {
            const bond = bondsKeys[j];
            bondsPositions.push(...CreateBondGeometry(bond.a, bond.b, 0.03, bondsMap.get(bond)!.arity).positions);
        }
    }
    let resultBondsPositions = new Float32Array(bondsPositions);
    let resultBonds = {positions: resultBondsPositions, colors: new Float32Array(resultBondsPositions.length).map((v) => 0.5)};
    let t3 = performance.now();
    console.log("Loading data: " + (t1-t0) + "ms");
    console.log("Creating atoms mesh: " + (t2-t1) + "ms");
    console.log("Creating bond mesh: " + (t3-t2) + "ms");
    console.log("Creating structure mesh: " + (t3-t0) + "ms (total)");
    console.log({atoms: resultAtoms, bonds: resultBonds});
    return {atoms: resultAtoms, bonds: resultBonds};
}

export function CreateAnimation(draw:any, rotation:vec3 = vec3.fromValues(0,0,0), isAnimation = true ) {
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

export function CreateTransforms(modelMat:mat4, translation:vec3 = [0,0,0], rotation:vec3 = [0,0,0], scaling:vec3 = [1,1,1]) {
    const rotateXMat = mat4.create();
    const rotateYMat = mat4.create();
    const rotateZMat = mat4.create();   
    const translateMat = mat4.create();
    const scaleMat = mat4.create();

    //perform indivisual transformations
    mat4.fromTranslation(translateMat, translation);
    mat4.fromXRotation(rotateXMat, rotation[0]);
    mat4.fromYRotation(rotateYMat, rotation[1]);
    mat4.fromZRotation(rotateZMat, rotation[2]);
    mat4.fromScaling(scaleMat, scaling);

    //combine all transformation matrices together to form a final transform matrix: modelMat
    mat4.multiply(modelMat, rotateXMat, scaleMat);
    mat4.multiply(modelMat, rotateYMat, modelMat);        
    mat4.multiply(modelMat, rotateZMat, modelMat);
    mat4.multiply(modelMat, translateMat, modelMat);
};

export function CreateViewProjection(aspectRatio = 1.0, cameraPosition:vec3 = [2, 2, 4], lookDirection:vec3 = [0, 0, 0], upDirection:vec3 = [0, 1, 0]) {
    const viewMatrix = mat4.create();
    const projectionMatrix = mat4.create();       
    const viewProjectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, 2*Math.PI/5, aspectRatio, 0.1, 1000.0);

    mat4.lookAt(viewMatrix, cameraPosition, lookDirection, upDirection);
    mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);

    const cameraOption = {
        eye: cameraPosition,
        center: lookDirection,
        zoomMax: 100,
        zoomSpeed: 2
    };

    return {
        viewMatrix,
        projectionMatrix,
        viewProjectionMatrix,
        cameraOption
    }
};


export function CreateGPUBufferUint(device:GPUDevice, data:Uint32Array, 
    usageFlag:GPUBufferUsageFlags = GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST) {
    const buffer = device.createBuffer({
        size: data.byteLength,
        usage: usageFlag,
        mappedAtCreation: true
    });
    new Uint32Array(buffer.getMappedRange()).set(data);
    buffer.unmap();
    return buffer;
};

export const CreateGPUBuffer = (device:GPUDevice, data:Float32Array, 
    usageFlag:GPUBufferUsageFlags = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST) => {
    const buffer = device.createBuffer({
        size: data.byteLength,
        usage: usageFlag,
        mappedAtCreation: true
    });
    new Float32Array(buffer.getMappedRange()).set(data);
    buffer.unmap();
    return buffer;
};

export async function InitGPU() {
    const checkgpu = CheckWebGPU();
    if(checkgpu.includes('Your current browser does not support WebGPU!')){
        console.log(checkgpu);
        throw('Your current browser does not support WebGPU!');
    }
    const canvas = document.getElementById('canvas-webgpu') as HTMLCanvasElement;
    const adapter = await navigator.gpu?.requestAdapter();
    const device = await adapter?.requestDevice() as GPUDevice;
    const context = canvas.getContext('webgpu') as GPUCanvasContext;

    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        device: device,
        format: format,
        alphaMode:'opaque'
    });
    return{ device, canvas, format, context };
};

export function CheckWebGPU() {
    let result = 'Great, your current browser supports WebGPU!';
    if (!navigator.gpu) {
        result = `Your current browser does not support WebGPU! Make sure you are on a system 
        with WebGPU enabled. Currently, WebGPU is supported in  
        <a href="https://www.google.com/chrome/canary/">Chrome canary</a>
        with the flag "enable-unsafe-webgpu" enabled. See the 
        <a href="https://github.com/gpuweb/gpuweb/wiki/Implementation-Status"> 
        Implementation Status</a> page for more details.   
        You can also use your regular Chrome to try a pre-release version of WebGPU via
        <a href="https://developer.chrome.com/origintrials/#/view_trial/118219490218475521">Origin Trial</a>.                
        `;
    } 

    const canvas = document.getElementById('canvas-webgpu') as HTMLCanvasElement;
    if(canvas){
        const div = document.getElementsByClassName('item2')[0] as HTMLDivElement;
        if(div){
            canvas.width  = div.offsetWidth;
            canvas.height = div.offsetHeight;

            function windowResize() {
                canvas.width  = div.offsetWidth;
                canvas.height = div.offsetHeight;
            };
            window.addEventListener('resize', windowResize);
        }
    }

    return result;
}