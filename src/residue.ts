import { Atom } from "./atom";

export class Residue {
    name: string; 
    id: number;
    atoms: Atom[];

    constructor (name: string, id: number, atoms: Atom[]) {
        this.name = name;
        this.id = id;
        this.atoms = atoms;
    }
}