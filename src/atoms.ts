import { vec3 } from "gl-matrix";

export const LoadData = (dataString: string) => {
    let lines = dataString.split("\n");
    let atoms = [];
    let sums = {x: 0, y: 0, z: 0};
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let match = line.match(/ATOM +\d+ +\w+ +\w+ +\w+ +\d+ +(-?\d+\.\d+) +(-?\d+\.\d+) +(-?\d+\.\d+) +(-?\d+\.\d+) +(-?\d+\.\d+) +(\w)/);
        if (match == null) {
            continue;
        }
        const atom = {x: parseFloat(match[1]), y: parseFloat(match[2]), z: parseFloat(match[3]), name: match[6]};
        sums.x += atom.x;
        sums.y += atom.y;
        sums.z += atom.z;
        atoms.push(atom);
    }
    for (let i = 0; i < atoms.length; i++) {
        atoms[i].x -= sums.x/atoms.length;
        atoms[i].y -= sums.y/atoms.length;
        atoms[i].z -= sums.z/atoms.length;
    }
    return atoms;
}

export const GetAtomColor = (atomName: string) => {
    if (atomName == "C") {
        return vec3.fromValues(0.3, 0.8, 0.3);
    } else if (atomName == "N") {
        return vec3.fromValues(0.05, 0.05, 0.85);
    } else if (atomName == "O") {
        return vec3.fromValues(0.85, 0.05, 0.05);
    } else if (atomName == "S") {
        return vec3.fromValues(0.975, 0.975, 0.025);
    }
    return vec3.fromValues(1, 0.1, 1);
}