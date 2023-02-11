import { vec2, vec3, mat4 } from 'gl-matrix';

export class Benchmarker {
    frameTimes: number[] = [];
    framesPerPosition: number = 60;
    currentFrame: number = 0;
    running: boolean = false;
    distanceFromOrigin: number = 50; 
    positions: vec3[];

    constructor () {
        this.positions = [];
        this.InitializePositions();
    }

    private InitializePositions() {
        this.positions = [];
        for (let x = -1; x < 2; x += 2) {
            for (let y = -1; y < 2; y += 2) {
                for (let z = -1; z < 2; z += 2) {
                    this.positions.push(vec3.fromValues(x*this.distanceFromOrigin/Math.sqrt(3), y*this.distanceFromOrigin/Math.sqrt(3), z*this.distanceFromOrigin/Math.sqrt(3)));
                }
            }
        }
        for (let x = -1; x < 2; x += 2) {
            this.positions.push(vec3.fromValues(x*this.distanceFromOrigin, 0, 0));
        }
        for (let y = -1; y < 2; y += 2) {
            this.positions.push(vec3.fromValues(0, y*this.distanceFromOrigin, 0));
        }
        for (let z = -1; z < 2; z += 2) {
            this.positions.push(vec3.fromValues(0, 0, z*this.distanceFromOrigin));
        }
    }

    public Start() {
        this.running = true;
        this.frameTimes = [];
        this.currentFrame = 0;
    }

    public GetFramePosition() {
        let position = Math.floor(this.currentFrame/this.framesPerPosition);
        if (position >= this.positions.length) {
            position = this.positions.length-1;
        }
        return this.positions[position];
    }

    public GetFrameViewMatrix() {
        let bViewMatrix = mat4.create();
        if (this.GetFramePosition()[0] == 0 && this.GetFramePosition()[2] == 0) {
            mat4.lookAt(bViewMatrix, this.GetFramePosition(), vec3.fromValues(0, 0, 0), vec3.fromValues(0, 0, 1));
        } else {
            mat4.lookAt(bViewMatrix, this.GetFramePosition(), vec3.fromValues(0, 0, 0), vec3.fromValues(0, 1, 0));
        }
        return bViewMatrix;
    }

    public SubmitFrameTime(time: number) {
        if (!this.running) {
            return;
        }
        this.frameTimes.push(time);
        this.currentFrame++;
    }

    public EndFrame() {
        if (!this.running) {
            return;
        }
        if (this.currentFrame >= this.framesPerPosition*this.positions.length) {
            this.running = false;
            console.log("Benchmark finished.\n Total average ms: " + this.frameTimes.reduce((a, b) => a+b)/this.frameTimes.length);
            for (let p = 0; p < this.positions.length; p++) {
                let sum = 0;
                for (let i = p*this.framesPerPosition; i < (p+1)*this.framesPerPosition; i++) {
                    sum += this.frameTimes[i];
                }
                let posString = this.positions[p][0].toFixed(3)+","+this.positions[p][1].toFixed(3)+","+this.positions[p][2].toFixed(3);
                console.log("Position " + p + " (" + posString + ") average ms: " + sum/this.framesPerPosition);
            }
            console.log(this.frameTimes);
        }
    }
}
