## Smooth Molecular Surfaces Rendering

This is an web application which renders smooth molecular surfaces using raymarching created using TypeScript and WebGPU.

## Usage Guide

The application is controlled with the mouse. Holding the left mouse button allows rotates the camera around the center of the molecule, holding the right mouse button pans the camera. Additionally, a few keybindings are available. The number keys on the numpad allow quick movement of the camera to a few predetermined positions around the molecule -- these keybindings are similar to the ones in Blender. The other number keys above the main part of the keyboard allow quick changing of debug modes.

On the left side of the application is an options menu. In this menu, different molecules can be loaded from `.pdb` files. Additionally, the rendering mode can be chosen and the scale of the atoms along with the range of the smooth minimum operation can be changed. When the scale of the atoms or the smooth minimum `k` parameter, which controls the range of the smooth minimum, is changed, the regenerate octree button needs to be clicked to get correct renders. All the available options in this menu are further documented in a following section.

## Documentation

All the available options in the side menu are described here: [Options](docs/OptionsExplained.md). 

All the included rendering and debug modes are explained here: [Rendering Modes](docs/RenderingModes.md). 

A brief overview of the codebase is here: [Code](docs/Code.md). 

## Development

#### Prerequisites

`npm`, `webpack`

#### Building

To build the application, `npm` needs to be installed first. 

`npm install --save-dev webpack` to install webpack, which is required for building the application.
`npm run dev` to build the project. The resulting site is contained in the folder `public`.

#### Running the Application

Open `index.html`, which is contained in the folder `public` in the browser. A browser with WebGPU support is needed. New versions of Chrome, starting with Chrome 113, support WebGPU by default. The full implementation status for other browsers can be found [here](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status).


[//]: # (Used sources: https://github.com/jack1232/WebGPU-Step-By-Step as starting point, https://github.com/alaingalvan/webgpu-seed, https://github.com/austinEng/webgpu-samples)
