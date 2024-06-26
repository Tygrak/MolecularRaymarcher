import { vec3, vec4 } from "gl-matrix";
import { Atom } from "./atom";
import { GetAtomType } from "./atomDatabase";

export class OctreeBin {
    min: vec3;
    max: vec3;
    start: number = -1;
    end: number = -1;
    children: number = 0;
    atomsInChildNodes: number = 0;
    layer: number = 0;
    isLeaf: boolean = false;

    constructor(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number) {
        this.min = vec3.fromValues(minX, minY, minZ);
        this.max = vec3.fromValues(maxX, maxY, maxZ);
    }

    public Center() {
        return vec3.fromValues((this.min[0]+this.max[0])/2, (this.min[1]+this.max[1])/2, (this.min[2]+this.max[2])/2);
    }

    public Size() {
        return vec3.fromValues(this.max[0]-this.min[0], this.max[1]-this.min[1], this.max[2]-this.min[2]);
    }

    public IsVec3Inside(a: vec3) {
        return a[0] >= this.min[0] && a[1] >= this.min[1] && a[2] >= this.min[2] 
            && a[0] <= this.max[0] && a[1] <= this.max[1] && a[2] <= this.max[2];
    }

    public IsAtomInside(a: Atom) {
        return this.IsVec3Inside(a.GetPosition());
    }

    public IsAtomInsideWithMargins(a: Atom, margin: number) {
        return a.x >= this.min[0]-margin && a.y >= this.min[1]-margin && a.z >= this.min[2]-margin 
            && a.x <= this.max[0]+margin && a.y <= this.max[1]+margin && a.z <= this.max[2]+margin;
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
    irregular: boolean;
    kdTreeEsque: boolean = true;
    debugLogsEnabled: boolean = false;

    constructor(atoms: Atom[], layers: number, margin: number = 1.5, makeKdEsque = false, makeIrregular = false, automaticOctreeSize = false) {
        this.limits = this.CalculateLimitsForAtoms(atoms, margin);
        if (automaticOctreeSize) {
            layers = 2;
            let smallestSize = Math.min(this.limits.size[0], Math.min(this.limits.size[1], this.limits.size[2]));
            let weightedSize = ((this.limits.size[0]+this.limits.size[1]+this.limits.size[2])/3+smallestSize)/2;
            console.log("margin: " + margin);
            let minMargin = Math.max(margin, 1);
            console.log("bounds: " + this.limits.size[0] + ", " + this.limits.size[1] + ", " + this.limits.size[2] + " weighted: " + weightedSize);
            console.log((weightedSize/(2**layers))-(minMargin*0.45*(2**layers)));
            while ((weightedSize/(2**layers))-(minMargin*0.45*(2**layers)) > -10.0) {
                layers++;
                console.log((weightedSize/(2**layers))-(minMargin*0.45*(2**layers)));
                /*if (makeKdEsque) {
                   smallestSize -= 0.1;
                }*/
            }
        }
        this.layers = layers;
        this.irregular = makeIrregular;
        this.kdTreeEsque = makeKdEsque;
        if (atoms.length > 100000 && makeIrregular == true && makeKdEsque == false) {
            this.irregular = false;
            console.log("Forcing octree to be regular. (number of atoms: " + atoms.length + ")");
        }
        let binsSize = 0;
        for (let layer = 1; layer <= layers; layer++) {
            binsSize += Math.pow(8, layer);
        }
        let atomsCopy = Object.assign([], atoms);
        this.tree = new Array<vec4>();
        this.bins = new Array<OctreeBin>();
        let t0 = performance.now();
        this.BuildTree(atomsCopy, margin);
        let t1 = performance.now();
        console.log("Built octree in: " + (t1-t0) + "ms (layers: " + this.layers + ", atoms: " + atoms.length + ", irregular: " + this.irregular  + ", kdtreeEsque: " + this.irregular + ")");
    }

    private BuildTree(atoms: Atom[], margin: number) {
        atoms = atoms.sort((a, b) => (a.x < b.x ? -1 : 1));
        let limits = this.limits;
        if (this.kdTreeEsque) {
            this.bins.push(...this.MakeKdBinsFromLimits(limits.minLimits, limits.maxLimits, limits.center, margin, atoms, 0));
        } else if (this.irregular) {
            this.bins.push(...this.FindOptimalBinsFromLimits(limits.minLimits, limits.maxLimits, limits.center, margin, atoms, 0, false));
        } else {
            this.bins.push(...this.MakeBinsFromLimitsUsingCenter(limits.minLimits, limits.maxLimits, limits.center, margin, atoms, 0, false));
        }
        let t0 = performance.now();
        for (let layer = 1; layer < this.layers; layer++) {
            if (atoms.length > 100000 || this.debugLogsEnabled) {
                let t1 = performance.now();
                console.log("Finished octree layer: " + layer + " (" + (t1-t0) + "ms)");
            }
            let start = this.GetLayerEnd(layer-1);
            let end = this.GetLayerEnd(layer);
            for (let layerBin = start; layerBin < end; layerBin++) {
                const b = this.bins[layerBin];
                if (this.kdTreeEsque) {
                    if (layer == this.layers-1) {
                        this.bins.push(...this.MakeBinsFromLimitsUsingCenter(b.min, b.max, b.Center(), margin, atoms, layer, true));
                    } else {
                        this.bins.push(...this.MakeKdBinsFromLimits(b.min, b.max, b.Center(), margin, atoms, layer));
                    }
                } else if (this.irregular && layer <= 2) {
                    if (layer == this.layers-1) {
                        this.bins.push(...this.FindOptimalBinsFromLimits(b.min, b.max, b.Center(), margin, atoms, layer, true));
                    } else {
                        this.bins.push(...this.FindOptimalBinsFromLimits(b.min, b.max, b.Center(), margin, atoms, layer, false));
                    }
                } else {
                    if (layer == this.layers-1) {
                        this.bins.push(...this.MakeBinsFromLimitsUsingCenter(b.min, b.max, b.Center(), margin, atoms, layer, true));
                    } else {
                        this.bins.push(...this.MakeBinsFromLimitsUsingCenter(b.min, b.max, b.Center(), margin, atoms, layer, false));
                    }
                }
            }
        }
        this.SetStartEndInNonLeafBins();
    }

    private FindOptimalBinsFromLimits(min: vec3, max: vec3, center: vec3, margin: number, atoms: Atom[], layer: number, insert: boolean) {
        let currCenter = center;
        let bins = this.MakeBinsFromLimitsUsingCenter(min, max, currCenter, margin, atoms, layer, false);
        let total = bins.reduce((sum, current) => sum+current.atomsInChildNodes, 0);
        for (let i = 0; i < 15; i++) {
            let highestIndex = 0;
            let highestValue = bins[0].atomsInChildNodes;
            for (let j = 0; j < bins.length; j++) {
                if (bins[j].atomsInChildNodes > highestValue) {
                    highestValue = bins[j].atomsInChildNodes;
                    highestIndex = j;
                }
            }
            if (highestValue < total/9) {
                break;
            }
            const e = 0.15;
            currCenter = vec3.fromValues(currCenter[0]*(1-e)+bins[highestIndex].Center()[0]*e, currCenter[1]*(1-e)+bins[highestIndex].Center()[1]*e, currCenter[2]*(1-e)+bins[highestIndex].Center()[2]*e);
            let prevBins = bins;
            bins = this.MakeBinsFromLimitsUsingCenter(min, max, currCenter, margin, atoms, layer, false);
            let stopMargin = margin*2*(5-layer)+0.25;
            if (bins.findIndex((b) => b.Size()[0] < stopMargin || b.Size()[1] < stopMargin || b.Size()[2] < stopMargin) != -1) {
                bins = prevBins;
                break;
            }
        }
        bins = this.MakeBinsFromLimitsUsingCenter(min, max, currCenter, margin, atoms, layer, insert);
        return bins;
    }

    private MakeKdBinsFromLimits(min: vec3, max: vec3, center: vec3, margin: number, atoms: Atom[], layer: number) {
        let bins: OctreeBin[] = [];
        let parentBin = new OctreeBin(min[0], min[1], min[2], max[0], max[1], max[2]);
        let start = this.binarySearch(atoms, parentBin.max[0]+margin);
        let insideAtoms: Atom[] = [];
        for (let i = start; i >= 0; i--) {
            if (atoms[i].x < parentBin.min[0]-margin) {
                break;
            }
            if (parentBin.IsAtomInsideWithMargins(atoms[i], margin)) {
                insideAtoms.push(atoms[i]);
            }
        }
        bins = this.SplitKdBin(parentBin, margin, insideAtoms, layer, 0);
        let bins2 = [];
        for (let i = 0; i < bins.length; i++) {
            bins2.push(...this.SplitKdBin(bins[i], margin, insideAtoms, layer, 1));
        }
        let bins3 = [];
        for (let i = 0; i < bins2.length; i++) {
            bins3.push(...this.SplitKdBin(bins2[i], margin, insideAtoms, layer, 2));
        }
        bins3.sort((a, b) => (a.Center()[0] < b.Center()[0] ? -1 : 1));
        bins3.sort((a, b) => (a.Center()[1] < b.Center()[1] ? -1 : 1));
        bins3.sort((a, b) => (a.Center()[2] < b.Center()[2] ? -1 : 1));
        return bins3;
    }

    private SplitKdBin(parentBin: OctreeBin, margin: number, atoms: Atom[], layer: number, dim: number) {
        let bins: OctreeBin[] = [];
        let insideAtoms: Atom[] = [];
        //could possibly be optimized further
        for (let i = atoms.length-1; i >= 0; i--) {
            if (parentBin.IsAtomInsideWithMargins(atoms[i], margin)) {
                insideAtoms.push(atoms[i]);
            }
        }
        if (this.irregular && layer <= 2) {
            let resultMin = vec3.copy(vec3.create(), parentBin.max);
            let resultMax = vec3.copy(vec3.create(), parentBin.min);
            for (let i = insideAtoms.length-1; i >= 0; i--) {
                for (let dim = 0; dim < 3; dim++) {
                    resultMin[dim] = Math.min(insideAtoms[i].GetPosition()[dim], resultMin[dim]);
                    resultMax[dim] = Math.max(insideAtoms[i].GetPosition()[dim], resultMax[dim]);
                }
            }
            for (let dim = 0; dim < 3; dim++) {
                resultMin[dim] = Math.max(parentBin.min[dim], resultMin[dim]-margin);
                resultMax[dim] = Math.min(parentBin.max[dim], resultMax[dim]+margin);
            }
            parentBin.min = resultMin;
            parentBin.max = resultMax;
            if (resultMax == parentBin.min) {
                resultMax = resultMin;
            }
        }
        if (dim == 0) {
            insideAtoms = insideAtoms.sort((a, b) => (a.x < b.x ? -1 : 1));
        } else if (dim == 1) {
            insideAtoms = insideAtoms.sort((a, b) => (a.y < b.y ? -1 : 1));
        } else {
            insideAtoms = insideAtoms.sort((a, b) => (a.z < b.z ? -1 : 1));
        }
        if (insideAtoms.length <= 0) {
            bins.push(new OctreeBin(-1000000,-1000000, -1000000, -1000000, -1000000, -1000000));
            bins.push(new OctreeBin(-1000000,-1000000, -1000000, -1000000, -1000000, -1000000));
            return bins;
        }
        let middle = Math.floor(insideAtoms.length/2);
        let bin = new OctreeBin(parentBin.min[0], parentBin.min[1], parentBin.min[2], parentBin.max[0], parentBin.max[1], parentBin.max[2]);
        bin.layer = layer;
        if (dim == 0) {
            bin.max[0] = insideAtoms[middle].x;
        } else if (dim == 1) {
            bin.max[1] = insideAtoms[middle].y;
        } else {
            bin.max[2] = insideAtoms[middle].z;
        }
        bin.atomsInChildNodes = middle;
        bins.push(bin);
        bin = new OctreeBin(parentBin.min[0], parentBin.min[1], parentBin.min[2], parentBin.max[0], parentBin.max[1], parentBin.max[2]);
        bin.layer = layer;
        if (dim == 0) {
            bin.min[0] = insideAtoms[middle].x;
        } else if (dim == 1) {
            bin.min[1] = insideAtoms[middle].y;
        } else {
            bin.min[2] = insideAtoms[middle].z;
        }
        bin.atomsInChildNodes = atoms.length-middle;
        bins.push(bin);
        return bins;
    }

    private binarySearch(atoms: Atom[], targetX: number): number{
        let left: number = 0;
        let right: number = atoms.length - 1;
      
        let mid: number = Math.floor((left + right) / 2);
        while (left <= right && (left+right) > 0) {
            mid = Math.floor((left + right) / 2);
            if (atoms[mid-1].x > targetX && atoms[mid].x <= targetX) {
                return mid;
            } else if (targetX < atoms[mid].x) {
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        }
      
        return mid;
    }

    private MakeBinsFromLimitsUsingCenter(min: vec3, max: vec3, center: vec3, margin: number, atoms: Atom[], layer: number, insert: boolean) {
        let resultBins: OctreeBin[] = [];
        for (let z = 0; z < 2; z++) {
            for (let y = 0; y < 2; y++) {
                for (let x = 0; x < 2; x++) {
                    let minX = x == 0 ? min[0] : center[0];
                    let minY = y == 0 ? min[1] : center[1];
                    let minZ = z == 0 ? min[2] : center[2];
                    let maxX = x == 0 ? center[0] : max[0];
                    let maxY = y == 0 ? center[1] : max[1];
                    let maxZ = z == 0 ? center[2] : max[2];
                    let b: OctreeBin = new OctreeBin(minX, minY, minZ, maxX, maxY, maxZ);
                    b.layer = layer;

                    let start = this.binarySearch(atoms, b.max[0]+margin);
                    if (this.irregular && layer <= 2) {
                        let resultMin = vec3.fromValues(maxX, maxY, maxZ);
                        let resultMax = vec3.fromValues(minX, minY, minZ);
                        for (let i = start; i >= 0; i--) {
                            if (atoms[i].x < b.min[0]-margin) {
                                break;
                            }
                            if (b.IsAtomInsideWithMargins(atoms[i], margin)) {
                                for (let dim = 0; dim < 3; dim++) {
                                    resultMin[dim] = Math.min(atoms[i].GetPosition()[dim], resultMin[dim]);
                                    resultMax[dim] = Math.max(atoms[i].GetPosition()[dim], resultMax[dim]);
                                }
                            }
                        }
                        for (let dim = 0; dim < 3; dim++) {
                            resultMin[dim] = Math.max(b.min[dim], resultMin[dim]-margin);
                            resultMax[dim] = Math.min(b.max[dim], resultMax[dim]+margin);
                        }
                        b.min = resultMin;
                        b.max = resultMax;
                        if (resultMax == vec3.fromValues(minX, minY, minZ)) {
                            resultMax = resultMin;
                        }
                    }
                    
                    if (insert) {
                        b.start = this.tree.length;
                    }
                    for (let i = start; i >= 0; i--) {
                        if (atoms[i].x < b.min[0]-margin) {
                            break;
                        }
                        if (!insert && b.atomsInChildNodes > 10) {
                            break;
                        }
                        if (b.IsAtomInsideWithMargins(atoms[i], margin)) {
                            b.atomsInChildNodes++;
                            if (insert) {
                                let v = atoms[i].GetVec4Representation();
                                this.tree.push(v);
                            }
                        }
                    }
                    if (insert) {
                        b.end = this.tree.length;
                        b.isLeaf = true;
                    }
                    resultBins.push(b);
                }
            }
        }
        return resultBins;
    }

    private CalculateLimitsForAtoms(atoms: Atom[], margin: number) {
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
        minLimits[0] -= margin; minLimits[1] -= margin; minLimits[2] -= margin;
        maxLimits[0] += margin; maxLimits[1] += margin; maxLimits[2] += margin;
        let center = vec3.fromValues((minLimits[0]+maxLimits[0])/2, (minLimits[0]+maxLimits[0])/2, (minLimits[0]+maxLimits[0])/2);
        let size = vec3.subtract(vec3.fromValues(0, 0, 0), maxLimits, minLimits);
        return {minLimits, maxLimits, center, size};
    }

    private GetParentBin(bin: OctreeBin) {
        let binPreviousLayerStart = 0;
        for (let layer = 0; layer < bin.layer; layer++) {
            binPreviousLayerStart += layer <= 0 ? 0 : Math.pow(8, layer);
        }
        let parentIndex = this.bins.findIndex((b, index) => index >= binPreviousLayerStart && b.IsVec3Inside(bin.Center()));
        let parent = this.bins[parentIndex];
        return parent;
    }

    private IncrementChildAtomsCounterInParents(bin: OctreeBin) {
        let current = bin;
        while (current.layer != 0) {
            current = this.GetParentBin(current);
            current.atomsInChildNodes++;
        }
    }

    private SetStartEndInNonLeafBins() {
        for (let i = 0; i < this.bins.length; i++) {
            const bin = this.bins[i];
            if (!bin.isLeaf) {
                bin.start = -bin.atomsInChildNodes-1;
                bin.end = -bin.atomsInChildNodes-1;
            }
        }
    }

    private GetLayerEnd(layer: number) {
        let binsSize = 0;
        for (let l = 1; l <= layer; l++) {
            binsSize += Math.pow(8, l);
        }
        return binsSize;
    }

    public Nearest(atom: Atom) {
        
    }
}
