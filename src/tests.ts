import { vec4 } from "gl-matrix";
import { Atom } from "./atom";
import { KdTree } from "./kdtree";

export function TestKdTrees(){
    let atoms = [
        new Atom(0, 0, 0, "C", "C"), // 0
        new Atom(1, 0, 0, "C", "C"), // 1
        new Atom(0, 1, 0, "C", "C"), // 2
        new Atom(0, 0, 1, "C", "C"), // 3
        new Atom(1, 1, 0, "C", "C"), // 4
        new Atom(1, 0, 1, "C", "C"), // 5
        new Atom(0, 1, 1, "C", "C"), // 6
        new Atom(1, 1, 1, "C", "C"), // 7
        new Atom(2, 0, 0, "C", "C")];
    let tree = new KdTree(atoms);
    CompareAtoms(tree.Nearest(new Atom(0, 0, 0, "C", "C")).atom, atoms[0]);
    CompareAtoms(tree.Nearest(new Atom(0.9, 0, 0, "C", "C")).atom, atoms[1]);
    CompareAtoms(tree.Nearest(new Atom(0, 1.2, 0, "C", "C")).atom, atoms[2]);
    CompareAtoms(tree.Nearest(new Atom(0.9, 1.2, 0.5, "C", "C")).atom, atoms[7]);
    CompareAtoms(tree.Nearest(new Atom(1.8, 0.2, 0, "C", "C")).atom, atoms[8]);
    console.log("Kd tree tests passed");
}

function CompareAtoms(a: vec4, b: Atom) {
    if (a[0] != b.x || a[1] != b.y || a[2] != b.z) {
        //console.log("TestKdTrees failed");
        throw new Error("TestKdTrees failed");
    }
}