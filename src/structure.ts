import { vec2, vec3, mat4 } from 'gl-matrix';
import { CreateBondGeometry, CreateSphereGeometry, CubeData } from './meshHelpers';
import { LoadData } from './loadData';
import { GetAtomType } from './atomDatabase';
import { Atom } from './atom';
import { Chain } from './chain';
import { ChainMesh } from './chainMesh';

const AtomScale = 0.25;

export class Structure {
    atoms : Atom[];
    chains : Chain[];
    chainMeshes : ChainMesh[];

    constructor (dataFileName: string) {
        let t0 = performance.now();
        let loaded;
        if (dataFileName == "1aon") {
            const dataText = require('./data/1aon.pdb');
            loaded = LoadData(dataText);
        } else {
            const dataText = require('./data/1cqw.pdb');
            loaded = LoadData(dataText);
        }
        let t1 = performance.now();
        this.atoms = loaded.atoms;
        this.chains = loaded.chains;
        console.log("Chains:");
        console.log(this.chains);
        //console.log("Atoms:");
        //console.log(this.atoms);
        //const instanceMesh = CubeData();
        this.chainMeshes = [];
        for (let i = 0; i < this.chains.length; i++) {
            const chain = this.chains[i];
            this.chainMeshes.push(new ChainMesh(chain));
        }
        let t2 = performance.now();
        console.log("Loading data: " + (t1-t0) + "ms");
        console.log("Creating chain meshes: " + (t2-t1) + "ms");
    }

    public InitializeBuffers(device : GPUDevice) {
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
