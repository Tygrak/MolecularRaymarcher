import { Atom } from "./atom";
import { GetResidueType } from "./residueDatabase";

export class Residue {
    name: string; 
    sequenceNumber: number;
    atoms: Atom[];

    constructor (name: string, sequenceNumber: number, atoms: Atom[]) {
        this.name = name;
        this.sequenceNumber = sequenceNumber;
        this.atoms = atoms;
    }

    public FindAtom(residueAtomName: string) {
        return this.atoms.find((a) => a.residueAtomName == residueAtomName);
    }
}