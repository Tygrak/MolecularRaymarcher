import { Atom } from "./atom";
import { Residue } from "./residue";

const residueTypesText = require('./data/residueTypes.xml');
const aminoAcidBondsText = require('./data/aminoAcidBonds.xml');

export enum ResidueTypeEnum {
    AminoAcidBase20,
    AminoAcidExtra,
    Nucleobase,
    Solvent,
    Ligand
}

export class ResidueType {
    name: string;
    id: number;
    type: ResidueTypeEnum;
    identifier: string;
    bonds: {arity: number, a: string, b: string}[];

    constructor (id: number, type: string, identifier: string, name: string, bonds: {arity: number, a: string, b: string}[]) {
        this.id = id;
        this.type = this.GetEnumTypeFromType(type);
        this.identifier = identifier;
        this.name = name;
        this.bonds = bonds;
    }

    private GetEnumTypeFromType(type: string) {
        if (type == "aa_20") {
            return ResidueTypeEnum.AminoAcidBase20;
        } else if (type == "aa_ext") {
            return ResidueTypeEnum.AminoAcidExtra;
        } else if (type == "nb") {
            return ResidueTypeEnum.Nucleobase;
        } else if (type == "sol") {
            return ResidueTypeEnum.Solvent;
        } else if (type == "lig") {
            return ResidueTypeEnum.Ligand;
        } else  {
            return ResidueTypeEnum.Ligand;
        }
    }

    public GetAtomPairBondArity(a: Atom, b: Atom) {
        const bond = this.bonds.find((bond) => 
            (bond.a == a.residueAtomName && bond.b == b.residueAtomName) || (bond.a == b.residueAtomName && bond.b == a.residueAtomName));
        return bond?.arity ?? 1;
    }
}

export function LoadResidueTypes() {
    let aminoAcidBonds = LoadAminoAcidBonds();
    console.log(aminoAcidBonds);
    let result = [];
    let lines = residueTypesText.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let match = line.match(/<residue id="(\d+)" type="(\S+)" identifier="(\w+)" shortcut="\w+" name="([\w ]+)"/);
        if (match == null) {
            continue;
        }
        const id = parseInt(match[1]);
        let residueType = new ResidueType(id, match[2], match[3], match[4], (aminoAcidBonds.get(id) ?? []));
        result.push(residueType);
    }
    console.log(result);
    return result;
}

function LoadAminoAcidBonds() {
    let result: Map<number, {arity: number, a: string, b: string}[]> = new Map();
    let aminoAcids = [...aminoAcidBondsText.matchAll(/<aminoAcid id="(\d+)">([\W\w\n]+?)<\/aminoAcid>/g)];
    for (let i = 0; i < aminoAcids.length; i++) {
        let bondsResults = [];
        const id = parseInt(aminoAcids[i][1]);
        const bonds = aminoAcids[i][2];
        const bondsMatches = [...bonds.matchAll(/<bond arity="(\d+)">([\W\w\n]+?)<\/bond>/g)];
        for (let j = 0; j < bondsMatches.length; j++) {
            const bond = bondsMatches[j];
            const bondAtoms = bond[2];
            const bondArity = parseInt(bond[1]);
            let bondedAtoms : RegExpMatchArray = [...bondAtoms.matchAll(/<atom name="([\w\d]+)" \/>/g)];
            bondsResults.push({arity: bondArity, a: bondedAtoms[0][1], b: bondedAtoms[1][1]});
        }
        result.set(id, bondsResults);
    }
    return result;
}

function MakeResidueTypesNameMap(residueTypes : ResidueType[]) {
    let result : Map<string, ResidueType> = new Map();
    for (let i = 0; i < residueTypes.length; i++) {
        const residueType = residueTypes[i];
        result.set(residueType.name, residueType);
    }
    return result;
}

const ResidueTypes = LoadResidueTypes();
const ResidueTypesNameMap = MakeResidueTypesNameMap(ResidueTypes);

export function GetResidueType(residue : Residue) {
    return ResidueTypesNameMap.get(residue.name) ?? ResidueTypes[0];
}
