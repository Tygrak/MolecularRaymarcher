import Renderer from './renderer';
import {loadDataFromFile} from "./helper";

const canvas = document.getElementById("gfx") as HTMLCanvasElement;
canvas.width = canvas.height = 900;
const renderer = new Renderer(canvas);
renderer.start();
const dataFileInput = document.getElementById("dataFileInput") as HTMLInputElement;
const dataButton = document.getElementById("dataLoadButton");
dataButton.onclick = () => {
    if (dataFileInput.files.length == 0) {
        console.log("No file selected!");
        return;
    }
    loadDataFromFile(dataFileInput.files[0], (data) => renderer.loadData(data));
};
