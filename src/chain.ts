import { Atom } from "./atom";
import { GetAtomType } from "./atomDatabase";
import { Residue } from "./residue";
import { GetResidueType, ResidueType, ResidueTypeEnum } from "./residueDatabase";

export class Chain {
    name: string;
    residues: Residue[];
    bonds: Map<{a:Atom, b:Atom}, {arity: number, residue: Residue}> = new Map();
    bondsKeys: {a:Atom, b:Atom}[] = [];

    constructor (name: string, residues: Residue[]) {
        this.name = name;
        this.residues = residues;
    }

    public ComputeBonds() {
        this.bonds = new Map();
        for (let i = 0; i < this.residues.length; i++) {
            this.ComputeBondsInsideResidue(this.residues[i]);
        }
        this.ComputeBondsBetweenProteinResidues();
        this.ComputeBondsBetweenNucleicAcidResidues();
        this.DetermineBondsArity();
        this.bondsKeys = Array.from(this.bonds.keys());
    }

    // The lower bound for the test of bond length (not a precise number).
    private static TOLERANCE_MIN = 0.4;
    // The upper bound for the test of bond length (not a precise number).
    private static TOLERANCE_MAX = 0.56;

    private ComputeBondsInsideResidue(residue: Residue) {
        let firstAtom, secondAtom;
        for (let i = 0; i < residue.atoms.length; i++) {
            firstAtom = residue.atoms[i];
            for (let j = i + 1; j < residue.atoms.length; j++) {
                secondAtom = residue.atoms[j];
                // if bond between the atoms doesn't already exists, it is added according to the computation result. The bond between two hydrogens is prohibited.
                if (!this.IsAtomPairBonded(firstAtom, secondAtom) && (firstAtom.name != "H" || secondAtom.name != "H")) {
                    if (this.IsAtomsDistanceWithinTolerance(firstAtom, secondAtom)) {
                        this.bonds.set({a:firstAtom, b:secondAtom}, {arity: 1, residue: residue});
                    }
                }
            }
        }
    }

    private ComputeBondsBetweenProteinResidues() {
        let toCheck = [];
        for (let i = 0; i < this.residues.length; i++) {
            let residueType = GetResidueType(this.residues[i]);
            if (residueType.type != ResidueTypeEnum.Ligand && residueType.type != ResidueTypeEnum.Solvent) {
                toCheck.push(this.residues[i]);
            }
        }
        for (let i = 0; i < toCheck.length-1; i++) {
            const resFirst = toCheck[i];
            const resSecond = toCheck[i+1];
            const firstAtom = resFirst.FindAtom("C");
            const secondAtom = resSecond.FindAtom("N");
            if (firstAtom != null && secondAtom != null && !this.IsAtomPairBonded(firstAtom, secondAtom)) {
                if (this.IsAtomsDistanceWithinTolerance(firstAtom, secondAtom)) {
                    this.bonds.set({a:firstAtom, b:secondAtom}, {arity: 1, residue: resFirst});
                }
            }
        }
    }

    private ComputeBondsBetweenNucleicAcidResidues() {
        let toCheck = [];
        for (let i = 0; i < this.residues.length; i++) {
            let residueType = GetResidueType(this.residues[i]);
            if (residueType.type != ResidueTypeEnum.Solvent) {
                toCheck.push(this.residues[i]);
            }
        }
        for (let i = 0; i < toCheck.length-1; i++) {
            const resFirst = toCheck[i];
            const resSecond = toCheck[i+1];
            if (resSecond.sequenceNumber == (resFirst.sequenceNumber + 1)) {
                const firstAtom = resFirst.FindAtom("O3'");
                const secondAtom = resSecond.FindAtom("P");
                if (firstAtom != null && secondAtom != null && !this.IsAtomPairBonded(firstAtom, secondAtom)) {
                    if (this.IsAtomsDistanceWithinTolerance(firstAtom, secondAtom)) {
                        this.bonds.set({a:firstAtom, b:secondAtom}, {arity: 1, residue: resFirst});
                    }
                }
            }
        }
    }

    private DetermineBondsArity() {
        const keys = Array.from(this.bonds.keys());
        for (let i = 0; i < keys.length; i++) {
            const bond = keys[i];
            const bondProperties = this.bonds.get(bond)!;
            const residueType = GetResidueType(bondProperties.residue);
            if (residueType.type == ResidueTypeEnum.AminoAcidBase20 || residueType.type == ResidueTypeEnum.AminoAcidExtra) {
                this.bonds.set(bond, {arity: residueType.GetAtomPairBondArity(bond.a, bond.b), residue: bondProperties.residue});
            }
        }
    }

    private IsAtomsDistanceWithinTolerance(a: Atom, b: Atom) {
        const x = a.x - b.x;
        const y = a.y - b.y;
        const z = a.z - b.z;
        const distSq = x * x + y * y + z * z;
        const tolerance = GetAtomType(a).covalentRadius + GetAtomType(b).covalentRadius + Chain.TOLERANCE_MAX;
        return distSq > (Chain.TOLERANCE_MIN * Chain.TOLERANCE_MIN) && distSq < (tolerance * tolerance);
    }

    public IsAtomPairBonded(a: Atom, b: Atom) {
        return (this.bonds.get({a: a, b: b}) ?? {residue: null, arity: 0}).arity >= 1 ||  (this.bonds.get({a: b, b: a}) ?? {residue: null, arity: 0}).arity >= 1;
    }
}