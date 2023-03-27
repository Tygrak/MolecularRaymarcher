import { vec2, vec3, mat4 } from 'gl-matrix';
import { CreateBondGeometry, CreateSphereGeometry, CubeData } from './meshHelpers';
import { IsDataPcd, LoadDataPdb, LoadDataPcd, LoadDataObj, IsDataPdb } from './loadData';
import { GetAtomType } from './atomDatabase';
import { Atom } from './atom';
import { Chain } from './chain';
import { ChainMesh } from './chainMesh';

const AtomScale = 0.25;

export class Structure {
    atoms : Atom[];
    chains : Chain[];
    chainMeshes : ChainMesh[];

    constructor (dataText: string) {
        let t0 = performance.now();
        let loaded;
        if (IsDataPcd(dataText)) {
            loaded = LoadDataPcd(dataText, 100);
        } else if (IsDataPdb(dataText)) {
            loaded = LoadDataPdb(dataText);
        } else {
            loaded = LoadDataObj(dataText, 250);
        }
        this.atoms = loaded.atoms;
        this.chains = loaded.chains;
        this.AddChainIdToAtoms();
        let t1 = performance.now();
        console.log("Chains:");
        console.log(this.chains);
        //console.log("Atoms:");
        //console.log(this.atoms);
        //const instanceMesh = CubeData();
        this.chainMeshes = [];
        console.log("Loading data: " + (t1-t0) + "ms (" + this.atoms.length + " atoms)");
    }

    public CreateChainMeshes(device : GPUDevice) {
        if (this.chainMeshes.length >= this.chains.length) {
            return;
        }
        let t1 = performance.now();
        for (let i = 0; i < this.chains.length; i++) {
            const chain = this.chains[i];
            this.chainMeshes.push(new ChainMesh(chain));
        }
        this.InitializeBuffers(device);
        let t2 = performance.now();
        console.log("Creating chain meshes: " + (t2-t1) + "ms");
    }

    private AddChainIdToAtoms() {
        for (let i = 0; i < this.chains.length; i++) {
            const chain = this.chains[i];
            for (let j = 0; j < chain.residues.length; j++) {
                const residue = chain.residues[j];
                for (let k = 0; k < residue.atoms.length; k++) {
                    residue.atoms[k].chainId = i;
                }
            }
        }
    }

    private InitializeBuffers(device : GPUDevice) {
        this.chainMeshes.forEach(cm => cm.InitializeBuffers(device));
    }

    public DestroyBuffers() {
        this.chainMeshes.forEach(cm => cm.DestroyBuffers());
    }

    public DrawStructure(renderPass : GPURenderPassEncoder, percentageShown : number, bondsOnly : boolean = false) {
        let chainsShown = Math.ceil(this.chainMeshes.length*percentageShown);
        for (let i = 0; i < chainsShown; i++) {
            const chainMesh = this.chainMeshes[i];
            if (!chainMesh.initializedBuffers) {
                console.log("warning! tried drawing using uninitialized chainmesh ["+i+"]");
                continue;
            }
            let chainPercentageShown = 1;
            if (i == chainsShown-1) {
                chainPercentageShown = 1-(chainsShown-this.chainMeshes.length*percentageShown);
            }
            //let numberOfVerticesToDraw = chainMesh.atomsNumberOfVertices;
            let numberOfVerticesToDraw = Math.round(chainMesh.atomsNumberOfVertices*chainPercentageShown)-Math.round(chainMesh.atomsNumberOfVertices*chainPercentageShown)%3;
            if (!bondsOnly) {
                renderPass.setVertexBuffer(0, chainMesh.atomsVertexBuffer!);
                renderPass.setVertexBuffer(1, chainMesh.atomsColorBuffer!);
                renderPass.draw(numberOfVerticesToDraw);
            }
            //numberOfVerticesToDraw = chainMesh.bondsNumberOfVertices;
            numberOfVerticesToDraw = Math.round(chainMesh.bondsNumberOfVertices*chainPercentageShown)-Math.round(chainMesh.bondsNumberOfVertices*chainPercentageShown)%3;
            renderPass.setVertexBuffer(0, chainMesh.bondsVertexBuffer!);
            renderPass.setVertexBuffer(1, chainMesh.bondsColorBuffer!);
            renderPass.draw(numberOfVerticesToDraw);
        };
    }
}
