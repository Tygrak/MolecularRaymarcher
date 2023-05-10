## Smooth Molecular Surfaces Rendering

This is an web application which renders smooth molecular surfaces using raymarching created using TypeScript and WebGPU.

## Usage Guide

The application is controlled with the mouse. Holding the left mouse button allows rotates the camera around the center of the molecule, holding the right mouse button pans the camera. Additionally, a few keybindings are available. The number keys on the numpad allow quick movement of the camera to a few predetermined positions around the molecule -- these keybindings are similar to the ones in Blender. The other number keys above the main part of the keyboard allow quick changing of debug modes.

All the available options in the side menu are described here: [Options](docs/OptionsExplained.md). 
All the included rendering and debug modes are explained here: [Rendering Modes](docs/RenderingModes.md). 
A brief overview of the codebase is here: [Code](docs/Code.md). 

## Development

#### Prerequisites

npm, webpack

#### Building

`npm install --save-dev webpack` to install webpack which is required for building the application.

`npm run dev` to build the project. The resulting site is contained in the folder `public`.

#### Running

Open `index.html` in the browser, a browser with WebGPU support is needed. To enable webgpu in Chrome Canary go to: `chrome://flags/`, search for `#enable-unsafe-webgpu` and enable it.

Use the flag `--disable-dawn-features=disallow_unsafe_apis` when starting Chrome Canary to enable timestamps.


[//]: # (Used sources: https://github.com/jack1232/WebGPU-Step-By-Step as starting point, https://github.com/alaingalvan/webgpu-seed, https://github.com/austinEng/webgpu-samples)
