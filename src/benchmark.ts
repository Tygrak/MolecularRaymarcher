import { vec2, vec3, mat4 } from 'gl-matrix';

export class Benchmarker {
    frameTimes: number[] = [];
    framesPerPosition: number = 100;
    currentFrame: number = 0;
    running: boolean = false;
    distanceFromOrigin: number = 50; 
    positions: vec3[];
    t0: number = 0;
    canvasSizeX: number = 640;
    canvasSizeY: number = 640;
    moleculeName: string = "protein";
    printReducedResultsOnFinish: boolean = true;

    constructor () {
        this.positions = [];
        this.InitializePositions();
    }

    public InitializePositions() {
        this.positions = [];
        for (let z = -1; z < 2; z += 2) {
            for (let y = -1; y < 2; y += 2) {
                for (let x = -1; x < 2; x += 2) {
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
        this.t0 = performance.now();
    }
    
    public Stop() {
        this.PrintResults();
        this.running = false;
        this.frameTimes = [];
        this.currentFrame = 0;
        this.t0 = performance.now();
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
            this.PrintResults();
            if (this.printReducedResultsOnFinish) {
                this.PrintReducedResults();
            }
        }
    }

    public PrintResults() {
        let total = this.frameTimes.reduce((a, b) => a+b);
        console.log("Benchmark finished.\n Total average ms: " + total/this.frameTimes.length);
        for (let p = 0; p < this.positions.length; p++) {
            let sum = 0;
            for (let i = p*this.framesPerPosition; i < (p+1)*this.framesPerPosition; i++) {
                sum += this.frameTimes[i];
            }
        }
        let table = "";
        table += "\\hline\n";
        table += "\\multicolumn{3}{|c|}{"+this.moleculeName+" ("+this.canvasSizeX+"x"+this.canvasSizeY+")}\\\\\n";
        table += "\\hline\n";
        table += "& Average Time & Total Time \\\\\n";
        table += "\\hline\n";
        for (let p = 0; p < this.positions.length; p++) {
            let sum = 0;
            for (let i = p*this.framesPerPosition; i < (p+1)*this.framesPerPosition; i++) {
                sum += this.frameTimes[i];
            }
            if (p < 8) {
                table += "Corner " + (p+1) + " & ";
            } else {
                table += "Face " + (p-7) + " & ";
            }
            table += (sum/this.framesPerPosition).toFixed(3) + "ms & ";
            table += (sum).toFixed(3) + "ms\\\\\n";
        }
        table += "\\hline\n";
        table += "Total & ";
        table += (total/this.frameTimes.length).toFixed(3) + "ms & ";
        table += (total).toFixed(3) + "ms\\\\\n";
        table += "\\hline\n";
        console.log(table);
        console.log(this.moleculeName+" ("+this.canvasSizeX+"x"+this.canvasSizeY+"): "+(total/this.frameTimes.length).toFixed(3) + "ms");
        //console.log(this.frameTimes);
    }

    public PrintReducedResults() {
        let total = this.frameTimes.reduce((a, b) => a+b);
        let table = "";
        table += "\\hline\n";
        table += "\\multicolumn{3}{|c|}{"+this.moleculeName+" ("+this.canvasSizeX+"x"+this.canvasSizeY+")}\\\\\n";
        table += "\\hline\n";
        table += "& Average Time & Total Time \\\\\n";
        table += "\\hline\n";
        let cornersSum = 0;
        let facesSum = 0;
        for (let p = 0; p < this.positions.length; p++) {
            let sum = 0;
            for (let i = p*this.framesPerPosition; i < (p+1)*this.framesPerPosition; i++) {
                sum += this.frameTimes[i];
            }
            if (p < 8) {
                cornersSum += sum;
            } else {
                facesSum += sum;
            }
        }
        table += "Corners & ";
        table += (cornersSum/(this.framesPerPosition*8)).toFixed(3) + "ms & ";
        table += (cornersSum).toFixed(3) + "ms\\\\\n";
        table += "Faces & ";
        table += (facesSum/(this.framesPerPosition*6)).toFixed(3) + "ms & ";
        table += (facesSum).toFixed(3) + "ms\\\\\n";
        table += "\\hline\n";
        table += "Total & ";
        table += (total/this.frameTimes.length).toFixed(3) + "ms & ";
        table += (total).toFixed(3) + "ms\\\\\n";
        table += "\\hline\n";
        console.log(table);
        //console.log(this.frameTimes);
    }
}
