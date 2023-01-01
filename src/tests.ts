import { vec3, vec4 } from "gl-matrix";
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
        new Atom(2, 0, 0, "C", "C"), // 8
        new Atom(5, 1, 1, "C", "C"), // 9
        new Atom(5, 2, 1, "C", "C"), // 10
        new Atom(5, 0, 0, "C", "C")];
    let tree = new KdTree(atoms);
    CompareAtoms(tree.Nearest(new Atom(1.2, 0.0, 0, "C", "C")).atom, atoms[1], new Atom(1.2, 0.0, 0, "C", "C"));
    CompareAtoms(tree.Nearest(new Atom(0.6, 0.6, 0, "C", "C")).atom, atoms[4], new Atom(0.6, 0.6, 0, "C", "C"));
    CompareAtoms(tree.Nearest(new Atom(0, 0, 0, "C", "C")).atom, atoms[0], new Atom(0, 0, 0, "C", "C"));
    CompareAtoms(tree.Nearest(new Atom(0.9, 0, 0, "C", "C")).atom, atoms[1], new Atom(0.9, 0, 0, "C", "C"));
    CompareAtoms(tree.Nearest(new Atom(0, 1.2, 0, "C", "C")).atom, atoms[2], new Atom(0, 1.2, 0, "C", "C"));
    CompareAtoms(tree.Nearest(new Atom(0.9, 1.2, 0.75, "C", "C")).atom, atoms[7], new Atom(0.9, 1.2, 0.75, "C", "C"));
    CompareAtoms(tree.Nearest(new Atom(1.8, 0.2, 0, "C", "C")).atom, atoms[8], new Atom(1.8, 0.2, 0, "C", "C"));
    for (let x = 0; x < 7; x += 0.2) {
        for (let y = 0; y < 1.5; y += 0.2) {
            for (let z = 0; z < 1.5; z += 0.2) {
                let closest = FindClosest(new Atom(x, y, z, "C", "C"), atoms);
                CompareAtoms(tree.Nearest(new Atom(x, y, z, "C", "C")).atom, closest, new Atom(x, y, z, "C", "C"));
            }
        }
    }
    console.log("Kd tree tests passed");
}

function FindClosest(atom: Atom,  atoms: Atom[]) {
    let distance = vec3.distance(atom.GetPosition(), atoms[0].GetPosition());
    let id = 0;
    for (let i = 1; i < atoms.length; i++) {
        let d = vec3.distance(atom.GetPosition(), atoms[i].GetPosition());
        if (d <= distance) {
            id = i;
            distance = d;
        }
    }
    return atoms[id];
}

function CompareAtoms(a: vec4, b: Atom, fromAtom: Atom) {
    let bDist = vec3.distance(b.GetPosition(), fromAtom.GetPosition());
    let aDist = vec3.distance(vec3.fromValues(a[0], a[1], a[2]), fromAtom.GetPosition());
    let dif = Math.abs(vec3.distance(b.GetPosition(), fromAtom.GetPosition())-vec3.distance(vec3.fromValues(a[0], a[1], a[2]), fromAtom.GetPosition()));
    if (dif < 0.00000001) {
        return;
    }
    if (a[0] != b.x || a[1] != b.y || a[2] != b.z) {
        //console.log("TestKdTrees failed");
        console.log("Atoms failed:");
        console.log(a);
        console.log(b);
        console.log("Search from: " + fromAtom.x + ", " + fromAtom.y + "," + fromAtom.z);
        console.log("adist: " + aDist + " bdist: " + bDist);
        //throw new Error("TestKdTrees failed");
    }
}