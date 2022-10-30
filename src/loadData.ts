import { vec3 } from "gl-matrix";
import { Atom } from "./atom";
import { Chain } from "./chain";
import { Residue } from "./residue";

export const LoadData = (dataString: string) => {
    let lines = dataString.split("\n");
    let atoms = [];
    let sums = {x: 0, y: 0, z: 0};
    let chains = [];
    let chain = new Chain("-1", []);
    let residue = new Residue("", -1, []);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineParseResult = ParseDataLine(line);
        if (lineParseResult == null) {
            continue;
        }
        if (residue.sequenceNumber != lineParseResult.residueId) {
            if (residue.sequenceNumber != -1) {
                if (chain.name != lineParseResult.chainName) {
                    if (chain.name != "-1") {
                        chains.push(chain);
                    }
                    chain = new Chain(lineParseResult.chainName, []);
                }
                chain.residues.push(residue);
            }
            residue = new Residue(lineParseResult.residueName, lineParseResult.residueId, []);
        }
        residue.atoms.push(lineParseResult.atom);
        sums.x += lineParseResult.atom.x;
        sums.y += lineParseResult.atom.y;
        sums.z += lineParseResult.atom.z;
        atoms.push(lineParseResult.atom);
    }

    if (residue.sequenceNumber != -1) {
        chain.residues.push(residue);
    }
    if (chain.name != "-1") {
        chains.push(chain);
    }

    for (let i = 0; i < atoms.length; i++) {
        atoms[i].x -= sums.x/atoms.length;
        atoms[i].y -= sums.y/atoms.length;
        atoms[i].z -= sums.z/atoms.length;
    }
    for (let i = 0; i < chains.length; i++) {
        const chain = chains[i];
        chain.ComputeBonds();
    }
    return {atoms: atoms, chains: chains};
}

const ParseDataLine = (line: string) => {
    let match = line.match(/ATOM +\d+ +([\w']+) +(\w+) +(\w+) +(\d+) +(-?\d+\.\d+) +(-?\d+\.\d+) +(-?\d+\.\d+) +(-?\d+\.\d+) +(-?\d+\.\d+) +(\w)/);
    if (match == null) {
        return null;
    }
    const residueAtomName = match[1];
    const residueName = match[2];
    const chainName = match[3];
    const residueId = parseInt(match[4]);
    const atomName = match[10];
    const position = vec3.fromValues(parseFloat(match[5]), parseFloat(match[6]), parseFloat(match[7]));
    const atom = new Atom(position[0], position[1], position[2], atomName, residueAtomName);
    return {residueAtomName, residueName, chainName, residueId, atomName, position, atom};
}
