import { Atom } from "./atom";
import { Residue } from "./residue";

export class Chain {
    name: string;
    residues: Residue[];

    constructor (name: string, residues: Residue[]) {
        this.name = name;
        this.residues = residues;
    }
}