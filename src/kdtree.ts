import { vec3, vec4 } from "gl-matrix";
import { Atom } from "./atom";
import { GetAtomType } from "./atomDatabase";

export class KdTree {
    tree: vec4[];

    constructor(atoms: Atom[]) {
        let atomsCopy = Object.assign([], atoms);
        let size = Math.pow(2, Math.floor(Math.log2(atomsCopy.length)-0.0001+1));
        this.tree = new Array<vec4>(size).fill(vec4.fromValues(-1, -1, -1, -1));
        this.BuildTree(atomsCopy, 0, 0);
        // atoms.map(a => vec4.fromValues(a.x, a.y, a.z, 0));
    }

    private BuildTree(atoms: Atom[], position: number, depth: number) {
        if (atoms.length === 0) {
            return;
        }
        if (atoms.length === 1) {
            const atom = atoms[0];
            this.tree[position] = vec4.fromValues(atom.x, atom.y, atom.z, GetAtomType(atom).number);
            return;
        }
        const dim = depth % 3;
        atoms.sort((a, b) => a.GetPosition()[dim] - b.GetPosition()[dim]);
        const median = Math.floor(atoms.length / 2);
        const atom = atoms[median];
        const left = atoms.slice(0, median);
        const right = atoms.slice(median + 1);
        this.tree[position] = vec4.fromValues(atom.x, atom.y, atom.z, GetAtomType(atom).number);
        this.BuildTree(left, this.Left(position), depth + 1);
        this.BuildTree(right, this.Right(position), depth + 1);
    }


    public Nearest(atom: Atom) {
        let pos = atom.GetPosition();
        let curr = 0;
        let stack: number[] = [];
        let bestClipDistance = 10000000000;
        let bestDistance = 10000000000;
        let bestNode = 0;
        stack.push(curr);
        let n = 0;
        while (stack.length > 0) {
            curr = stack.pop()!;
            n++;
            /*if (curr > 0 && this.DimDist(pos, this.tree[this.Parent(curr)], this.DimOfNode(this.Parent(curr))) > bestClipDistance) {
                continue;
            }*/
            const dim = this.DimOfNode(curr);
            let distance = vec3.distance(vec3.fromValues(this.tree[curr][0], this.tree[curr][1], this.tree[curr][2]), pos);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestNode = curr;
            }
            bestClipDistance = Math.min(this.DimDist(pos, this.tree[curr], dim), bestClipDistance);
            if (pos[dim] > this.tree[curr][dim] && this.Right(curr) != -1) {
                if (this.Left(curr) != -1 && this.tree[this.Left(curr)][3] != -1) {
                    let dist = this.DimDist(pos, this.tree[curr], dim);
                    if (dist < bestDistance) {
                        stack.push(this.Left(curr));
                    }
                }
                if (this.tree[this.Right(curr)][3] == -1) {
                    continue;
                }
                stack.push(this.Right(curr));
            } else if (this.Left(curr) != -1) {
                if (this.Right(curr) != -1 && this.tree[this.Right(curr)][3] != -1) {
                    let dist = this.DimDist(pos, this.tree[curr], dim);
                    if (dist < bestDistance) {
                        stack.push(this.Right(curr));
                    }
                }
                if (this.tree[this.Left(curr)][3] == -1) {
                    continue;
                }
                stack.push(this.Left(curr));
            }
        }
        let traversed = n/this.tree.filter(n=>n[3] != -1).length;
        return {atom: this.tree[bestNode], distance: bestDistance, id: bestNode};
    }

    public Left(i: number) {
        const result = 2*Math.round(i)+1;
        if (result >= this.tree.length || i < 0) {
            return -1;
        }
        return result;
    }

    public Right(i: number) {
        const result = 2*Math.round(i)+2;
        if (result >= this.tree.length || i < 0) {
            return -1;
        }
        return result;
    }

    public Parent(i: number) {
        const result = Math.floor(Math.round(i-1)/2);
        if (result >= this.tree.length || i < 0) {
            return -1;
        }
        return result;
    }

    public DimDist(a: vec3 | vec4, b: vec3 | vec4, dim: number) {
        return Math.abs(a[dim]-b[dim]);
    }

    public DimOfNode(i: number) {
        if (i <= 0.001) {
            return 0;
        }
        return Math.floor(Math.log2(i+1))%3;
    }
}
