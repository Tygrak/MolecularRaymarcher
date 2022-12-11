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
        this.tree[position] = vec4.fromValues(atom.x, atom.y, atom.z, GetAtomType(atom).number);
        this.BuildTree(atoms.slice(0, median), this.Left(position), depth + 1);
        this.BuildTree(atoms.slice(median + 1), this.Right(position), depth + 1);
    }

    public Nearest(atom: Atom) {
        let curr = 0;
        let i = 0;
        while (this.Left(curr) != -1) {
            const dim = i % 3;
            i++;
            if (atom.GetPosition()[dim] > this.tree[curr][dim] && this.Right(curr) != -1) {
                if (this.tree[this.Right(curr)][3] == -1) {
                    break;
                }
                curr = this.Right(curr);
            } else {
                if (this.tree[this.Left(curr)][3] == -1) {
                    break;
                }
                curr = this.Left(curr);
            }
        }
        let bestDistance = vec3.distance(vec3.fromValues(this.tree[curr][0], this.tree[curr][1], this.tree[curr][2]), atom.GetPosition());
        let bestNode = curr;
        i--;
        while (this.Parent(curr) != -1) {
            const dim = i % 3;
            i--;
            const prev = curr;
            curr = this.Parent(curr);
            const distance = vec3.distance(vec3.fromValues(this.tree[curr][0], this.tree[curr][1], this.tree[curr][2]), atom.GetPosition());
            if (distance < bestDistance) {
                bestDistance = distance;
                bestNode = curr;
            }
            let subDim = dim;
            let subtreeCurr = curr;
            if (this.Right(curr) == prev && this.Left(curr) != -1) {
                subtreeCurr = this.Left(curr);
            } else if (this.Right(curr) != -1) {
                subtreeCurr = this.Right(curr);
            } else {
                continue;
            }
            while (subtreeCurr != -1 && Math.abs(this.tree[subtreeCurr][subDim]-atom.GetPosition()[subDim]) < bestDistance && this.Left(subtreeCurr) != -1) {
                subDim = (subDim+1) % 3;
                const distance = vec3.distance(vec3.fromValues(this.tree[subtreeCurr][0], this.tree[subtreeCurr][1], this.tree[subtreeCurr][2]), atom.GetPosition());
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestNode = subtreeCurr;
                }
                if (atom.GetPosition()[subDim] > this.tree[subtreeCurr][subDim] && this.Right(subtreeCurr) != -1) {
                    if (this.tree[this.Right(subtreeCurr)][3] == -1) {
                        break;
                    }
                    subtreeCurr = this.Right(subtreeCurr);
                } else {
                    if (this.tree[this.Left(subtreeCurr)][3] == -1) {
                        break;
                    }
                    subtreeCurr = this.Left(subtreeCurr);
                }
            }
        }
        return {atom: this.tree[bestNode], distance: bestDistance};
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
}
