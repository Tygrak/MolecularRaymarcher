import { Atom } from "./atom";

const atomTypesText = require('./data/atomTypes.xml');
const atomCovalentRadiiText = require('./data/atomCovalentRadii.xml');

export class AtomType {
    name: string;
    identifier: string;
    number: number;
    covalentRadius: number = 1;

    constructor (number: number, name: string, identifier: string) {
        this.name = name;
        this.identifier = identifier;
        this.number = number;
    }
}

export function LoadAtomTypes() {
    let covalentRadii = LoadCovalentRadii();
    let result = [];
    let lines = atomTypesText.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let match = line.match(/atom identifier="(\w+)" name="(\w+)" number="(\d+)"/);
        if (match == null) {
            continue;
        }
        let atomType = new AtomType(parseInt(match[3]), match[2], match[1]);
        atomType.covalentRadius = covalentRadii.get(atomType.number) ?? 1;
        result.push(atomType);
    }
    return result;
}

function LoadCovalentRadii() {
    let result : Map<number, number> = new Map();
    let lines = atomCovalentRadiiText.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let match : RegExpMatchArray = line.match(/covalent id="(\d+)" radius="(\d+\.\d+)"/);
        if (match == null) {
            continue;
        }
        result.set(parseInt(match[1]), parseFloat(match[2]));
    }
    return result;
}

function MakeAtomTypesNumberMap(atomTypes : AtomType[]) {
    let result : Map<number, AtomType> = new Map();
    for (let i = 0; i < atomTypes.length; i++) {
        const atomType = atomTypes[i];
        result.set(atomType.number, atomType);
    }
    return result;
}

function MakeAtomTypesIdentifierMap(atomTypes : AtomType[]) {
    let result : Map<string, AtomType> = new Map();
    for (let i = 0; i < atomTypes.length; i++) {
        const atomType = atomTypes[i];
        result.set(atomType.identifier, atomType);
    }
    return result;
}

const AtomTypes = LoadAtomTypes();
const AtomTypesNumberMap = MakeAtomTypesNumberMap(AtomTypes);
const AtomTypesIdentifierMap = MakeAtomTypesIdentifierMap(AtomTypes);

export function GetAtomType(atom : Atom) {
    return AtomTypesIdentifierMap.get(atom.name) ?? AtomTypes[0];
}
