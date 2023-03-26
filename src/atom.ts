import { vec3, vec4 } from "gl-matrix";
import { GetAtomType } from "./atomDatabase";

export class Atom {
    name: string;
    residueAtomName: string;
    x: number;
    y: number;
    z: number;
    chainId: number = 0;

    constructor (x: number, y: number, z: number, name: string, residueAtomName: string) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.name = name;
        this.residueAtomName = residueAtomName;
    }

    public GetPosition() {
        return vec3.fromValues(this.x, this.y, this.z);
    }

    public GetVec4Representation() {
        let typeShift = 0;
        if (this.residueAtomName == "N" || this.residueAtomName == "CA" || this.residueAtomName == "C" || this.residueAtomName == "O") {
            typeShift = 5000000;
        }
        typeShift += this.chainId*100;
        return vec4.fromValues(this.x, this.y, this.z, GetAtomType(this).number+typeShift);
    }

    public GetColor() {
        if (this.name == "C") {
            return vec3.fromValues(0.3, 0.8, 0.3);
        } else if (this.name == "N") {
            return vec3.fromValues(0.05, 0.05, 0.85);
        } else if (this.name == "O") {
            return vec3.fromValues(0.85, 0.05, 0.05);
        } else if (this.name == "S") {
            return vec3.fromValues(0.975, 0.975, 0.025);
        }
        return vec3.fromValues(1, 0.1, 1);
    }

    public Distance(atom: Atom) {
        return vec3.distance(this.GetPosition(), atom.GetPosition());
    }
}