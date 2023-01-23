import { vec3, vec4 } from "gl-matrix";
import { Atom } from "./atom";
import { GetAtomType } from "./atomDatabase";

export class OctreeBin {
    min: vec3;
    max: vec3;
    start: number;
    end: number;
    children: number = 0;

    constructor(x: number, y: number, z: number, minLimit: vec3, size: vec3, dimDivider: number) {
        this.min = vec3.fromValues(minLimit[0]+x*(size[0]/dimDivider), minLimit[1]+y*(size[1]/dimDivider), minLimit[2]+z*(size[2]/dimDivider));
        this.max = vec3.fromValues(minLimit[0]+(1+x)*(size[0]/dimDivider), minLimit[1]+(1+y)*(size[1]/dimDivider), minLimit[2]+(1+z)*(size[2]/dimDivider));
        this.start = -1;
        this.end = -1;
    }

    public Center() {
        return vec3.fromValues((this.min[0]+this.max[0])/2, (this.min[1]+this.max[1])/2, (this.min[2]+this.max[2])/2);
    }

    public IsVec3Inside(a: vec3) {
        return a[0] >= this.min[0] && a[1] >= this.min[1] && a[2] >= this.min[2] 
            && a[0] <= this.max[0] && a[1] <= this.max[1] && a[2] <= this.max[2];
    }

    public IsAtomInside(a: Atom) {
        return this.IsVec3Inside(a.GetPosition());
    }

    public AsArray() {
        let buffer = new Float32Array(8);
        buffer[0] = this.min[0];
        buffer[1] = this.min[1];
        buffer[2] = this.min[2];
        buffer[3] = this.start;
        buffer[4] = this.max[0];
        buffer[5] = this.max[1];
        buffer[6] = this.max[2];
        buffer[7] = this.end;
        return buffer;
    }
}

export class Octree {
    limits: {minLimits: vec3, maxLimits: vec3, center: vec3, size: vec3};
    tree: vec4[];
    bins: OctreeBin[];
    layers: number;

    constructor(atoms: Atom[], layers: number, margin: number = 1.5) {
        this.layers = layers;
        let binsSize = 0;
        for (let layer = 1; layer < layers; layer++) {
            binsSize += Math.pow(8, layer);
        }
        let atomsCopy = Object.assign([], atoms);
        this.tree = new Array<vec4>(atomsCopy.length).fill(vec4.fromValues(-1, -1, -1, -1));
        this.bins = new Array<OctreeBin>(binsSize);
        this.limits = this.CalculateLimitsForAtoms(atoms);
        this.limits.minLimits[0] -= margin; this.limits.minLimits[1] -= margin; this.limits.minLimits[2] -= margin;
        this.limits.maxLimits[0] += margin; this.limits.maxLimits[1] += margin; this.limits.maxLimits[2] += margin;
        this.limits.size[0] += 2*margin; this.limits.size[1] += 2*margin; this.limits.size[2] += 2*margin;
        this.BuildTree(atomsCopy, margin);
    }

    private BuildTree(atoms: Atom[], margin: number) {
        let limits = this.limits;
        let currPos = 0;
        for (let layer = 0; layer < this.layers; layer++) {
            let dimDivider = Math.pow(2, layer+1);
            let binId = 0;
            for (let z = 0; z < dimDivider; z++) {
                for (let y = 0; y < dimDivider; y++) {
                    for (let x = 0; x < dimDivider; x++) {
                        let bin = new OctreeBin(x, y, z, limits.minLimits, limits.size, dimDivider);
                        if (layer == 0) {
                            this.bins[binId] = bin;
                        } else {
                            let parentIndex = this.bins.findIndex((b) => b.IsVec3Inside(bin.Center()));
                            let parent = this.bins[parentIndex];
                            this.bins[(parentIndex+1)*8+parent.children] = bin;
                            parent.children++;
                        }
                        if (layer == this.layers-1) {
                            bin.start = currPos;
                            for (let i = atoms.length-1; i >= 0; i--) {
                                if (bin.IsAtomInside(atoms[i])) {
                                    this.tree[currPos] = atoms[i].GetVec4Representation();
                                    currPos++;
                                    atoms.splice(i, 1);
                                }
                            }
                            bin.end = currPos+1;
                        }
                        binId++;
                    }
                }
            }
        }
    }

    private CalculateLimitsForAtoms(atoms: Atom[]) {
        let minLimits = vec3.fromValues(1000000, 1000000, 1000000);
        let maxLimits = vec3.fromValues(-1000000, -1000000, -1000000);
        for (let atomId = 0; atomId < atoms.length; atomId++) {
            const atom = atoms[atomId];
            if (atom.x < minLimits[0]) {
                minLimits[0] = atom.x;
            }
            if (atom.y < minLimits[1]) {
                minLimits[1] = atom.y;
            }
            if (atom.z < minLimits[2]) {
                minLimits[2] = atom.z;
            }
            if (atom.x > maxLimits[0]) {
                maxLimits[0] = atom.x;
            }
            if (atom.y > maxLimits[1]) {
                maxLimits[1] = atom.y;
            }
            if (atom.z > maxLimits[2]) {
                maxLimits[2] = atom.z;
            }
        }
        let center = vec3.add(vec3.fromValues(0, 0, 0), minLimits, maxLimits);
        let size = vec3.subtract(vec3.fromValues(0, 0, 0), maxLimits, minLimits);
        return {minLimits, maxLimits, center, size};
    }

    public Nearest(atom: Atom) {
        
    }
}
