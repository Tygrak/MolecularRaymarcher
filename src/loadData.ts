import { vec3 } from "gl-matrix";
import { Atom } from "./atom";
import { Chain } from "./chain";
import { Residue } from "./residue"; 

export const IsDataPdb = (dataString: string) => {
    let lines = dataString.split("\n");
    return lines[0].indexOf("HEADER") != -1;
}

export const LoadDataPdb = (dataString: string) => {
    let lines = dataString.split("\n");
    let atoms = [];
    let sums = {x: 0, y: 0, z: 0};
    let chains = [];
    let chain = new Chain("-1", []);
    let residue = new Residue("", -1, []);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineParseResult = ParseDataLinePdb(line);
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

//todo: read according to this https://www.wwpdb.org/documentation/file-format-content/format33/sect9.html
const ParseDataLinePdb = (line: string) => {
    let match = line.match(/ATOM  +\d+ +([\w']+) +(\w+) +(\w+) {0,3}([\d-]+) +(-?\d+\.\d{1,3}) *(-?\d+\.\d{1,3}) *(-?\d+\.\d{1,3}) *(-?\d{1,3}\.\d{1,2}) *(-?\d{1,3}\.\d{1,2}) +(\w)/);
    if (match == null) {
        if (line.match(/^ATOM  /)) {
            console.log("parse warning, can't match line: '"+ line + "'");
        }
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

//todo read binary compressed pcd

export const IsDataPcd = (dataString: string) => {
    let lines = dataString.split("\n");
    return (lines[0].indexOf("# .PCD") != -1 || lines[0].indexOf("VERSION") != -1);
}

export const LoadDataPcd = (dataString: string, scale: number = 1) => {
    let lines = dataString.split("\n");
    let atoms = [];
    let sums = {x: 0, y: 0, z: 0};
    let chains = [];
    let chain = new Chain("MainChain", []);
    let residue = new Residue("MainResidue", -1, []);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineParseResult = ParseDataLinePcd(line);
        if (lineParseResult == null) {
            continue;
        }
        residue.atoms.push(lineParseResult.atom);
        sums.x += lineParseResult.atom.x;
        sums.y += lineParseResult.atom.y;
        sums.z += lineParseResult.atom.z;
        atoms.push(lineParseResult.atom);
    }

    chain.residues.push(residue);
    chains.push(chain);

    for (let i = 0; i < atoms.length; i++) {
        atoms[i].x = (atoms[i].x - (sums.x/atoms.length))*scale;
        atoms[i].y = (atoms[i].y - (sums.y/atoms.length))*scale;
        atoms[i].z = (atoms[i].z - (sums.z/atoms.length))*scale;
    }
    for (let i = 0; i < chains.length; i++) {
        const chain = chains[i];
        if (chain.residues[0].atoms.length < 500) {
            chain.ComputeBonds();
        }
    }
    return {atoms: atoms, chains: chains};
}

const ParseDataLinePcd = (line: string) => {
    let match = line.match(/^(-?\d+\.?\d*(?:e\+?\-?\d+)?) (-?\d+\.?\d*(?:e\+?\-?\d+)?) (-?\d+\.?\d*(?:e\+?\-?\d+)?)/);
    if (match == null) {
        return null;
    }
    const residueAtomName = "C";
    const residueName = "C";
    const chainName = "C";
    const residueId = "C";
    const atomName = "C";
    const position = vec3.fromValues(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]));
    const atom = new Atom(position[0], position[1], position[2], atomName, residueAtomName);
    return {residueAtomName, residueName, chainName, residueId, atomName, position, atom};
}

export const LoadDataObj = (dataString: string, scale: number = 1) => {
    let lines = dataString.split("\n");
    let atoms = [];
    let sums = {x: 0, y: 0, z: 0};
    let chains = [];
    let chain = new Chain("MainChain", []);
    let residue = new Residue("MainResidue", -1, []);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineParseResult = ParseDataLineObj(line);
        if (lineParseResult == null) {
            continue;
        }
        residue.atoms.push(lineParseResult.atom);
        sums.x += lineParseResult.atom.x;
        sums.y += lineParseResult.atom.y;
        sums.z += lineParseResult.atom.z;
        atoms.push(lineParseResult.atom);
    }

    chain.residues.push(residue);
    chains.push(chain);

    let limitMaxSize = 0;
    for (let i = 0; i < atoms.length; i++) {
        atoms[i].x = atoms[i].x - (sums.x/atoms.length);
        atoms[i].y = atoms[i].y - (sums.y/atoms.length);
        atoms[i].z = atoms[i].z - (sums.z/atoms.length);
        limitMaxSize = Math.max(limitMaxSize, Math.max(Math.max(atoms[i].x, atoms[i].y), atoms[i].z));
    }
    for (let i = 0; i < atoms.length; i++) {
        atoms[i].x = atoms[i].x*(20/limitMaxSize);
        atoms[i].y = atoms[i].y*(20/limitMaxSize);
        atoms[i].z = atoms[i].z*(20/limitMaxSize);
    }
    for (let i = 0; i < chains.length; i++) {
        const chain = chains[i];
        if (chain.residues[0].atoms.length < 500) {
            chain.ComputeBonds();
        }
    }
    return {atoms: atoms, chains: chains};
}

const ParseDataLineObj = (line: string) => {
    let match = line.match(/^v +(-?\d+\.?\d*(?:e\+?\-?\d+)?) (-?\d+\.?\d*(?:e\+?\-?\d+)?) (-?\d+\.?\d*(?:e\+?\-?\d+)?)/);
    if (match == null) {
        return null;
    }
    const residueAtomName = "C";
    const residueName = "C";
    const chainName = "C";
    const residueId = "C";
    const atomName = "C";
    const position = vec3.fromValues(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]));
    const atom = new Atom(position[0], position[1], position[2], atomName, residueAtomName);
    return {residueAtomName, residueName, chainName, residueId, atomName, position, atom};
}


