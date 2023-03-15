import { GetAtomType } from "./atomDatabase";
import { Chain } from "./chain";
import { CreateGPUBuffer } from "./helper";
import { CreateBondGeometry, CreateSphereGeometry } from "./meshHelpers";

const AtomScale = 0.25;

export class ChainMesh {
    chain : Chain;
    atomsPositions : Float32Array;
    atomsColors : Float32Array;
    bondsPositions : Float32Array;
    bondsColors : Float32Array;
    
    initializedBuffers : boolean = false;
    atomsNumberOfVertices : number = -1;
    atomsVertexBuffer? : GPUBuffer;
    atomsColorBuffer? : GPUBuffer;
    bondsNumberOfVertices : number = -1;
    bondsVertexBuffer? : GPUBuffer;
    bondsColorBuffer? : GPUBuffer;

    constructor (chain: Chain) {
        let t0 = performance.now();
        this.chain = chain;
        const instanceMesh = CreateSphereGeometry(1, 12, 6);
        let atomsAmount = 0;
        this.chain.residues.forEach(r => {atomsAmount += r.atoms.length});
        this.atomsPositions = new Float32Array(instanceMesh.positions.length*atomsAmount);
        this.atomsColors = new Float32Array(instanceMesh.colors.length*atomsAmount);
        let atomI = 0;
        for (let r = 0; r < this.chain.residues.length; r++) {
            const residue = this.chain.residues[r];
            for (let i = 0; i < residue.atoms.length; i++) {
                const atom = residue.atoms[i];
                let positions = new Float32Array(instanceMesh.positions);
                for (let j = 0; j < positions.length; j++) {
                    if (j%3 == 0) {
                        positions[j] = (positions[j]*AtomScale)*GetAtomType(atom).covalentRadius+atom.x;
                    } else if (j%3 == 1) {
                        positions[j] = (positions[j]*AtomScale)*GetAtomType(atom).covalentRadius+atom.y;
                    } else if (j%3 == 2) {
                        positions[j] = (positions[j]*AtomScale)*GetAtomType(atom).covalentRadius+atom.z;
                    }
                }
                let atomColor = atom.GetColor();
                let colors = new Float32Array(instanceMesh.colors);
                for (let j = 0; j < colors.length; j++) {
                    colors[j] = atomColor[j%3];
                }
                this.atomsPositions.set(positions, instanceMesh.positions.length*atomI);
                this.atomsColors.set(colors, instanceMesh.colors.length*atomI);
                atomI++;
            }
        }
        let t1 = performance.now();
        let bondsPositions = [];
        const bondsMap = this.chain.bonds;
        const bondsKeys = this.chain.bondsKeys;
        for (let j = 0; j < bondsKeys.length; j++) {
            const bond = bondsKeys[j];
            bondsPositions.push(...CreateBondGeometry(bond.a, bond.b, 0.03, bondsMap.get(bond)!.arity).positions);
        }
        if (bondsKeys.length == 0) {
            bondsPositions.push(...CreateBondGeometry(this.chain.residues[0].atoms[0], this.chain.residues[0].atoms[0], 0.03, 1).positions);
        }
        this.bondsPositions = new Float32Array(bondsPositions);
        this.bondsColors = new Float32Array(this.bondsPositions.length).map((v) => 0.5); 
        let t2 = performance.now();
    }

    public InitializeBuffers(device : GPUDevice) {
        this.initializedBuffers = true;
        this.atomsNumberOfVertices = this.atomsPositions.length / 3;
        this.atomsVertexBuffer = CreateGPUBuffer(device, this.atomsPositions);
        this.atomsColorBuffer = CreateGPUBuffer(device, this.atomsColors);
        this.bondsNumberOfVertices = this.bondsPositions.length / 3;
        this.bondsVertexBuffer = CreateGPUBuffer(device, this.bondsPositions);
        this.bondsColorBuffer = CreateGPUBuffer(device, this.bondsColors);
    }

    public DestroyBuffers() {
        if (!this.initializedBuffers) {
            return;
        }
        this.initializedBuffers = false;
        this.atomsNumberOfVertices = -1;
        this.atomsVertexBuffer?.destroy();
        this.atomsColorBuffer?.destroy();
        this.bondsNumberOfVertices = -1;
        this.bondsVertexBuffer?.destroy();
        this.bondsColorBuffer?.destroy();
    }
}