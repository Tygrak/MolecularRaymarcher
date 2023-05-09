# Smooth Molecular Surfaces Rendering

This is an web application which renders smooth molecular surfaces using raymarching created using TypeScript and WebGPU.

# Documentation

All the included rendering and debug modes are explained here: [Rendering Modes](docs/RenderingModes.md). 

# Development

## Prerequisites

npm, webpack

## Building

`npm install --save-dev webpack` to install webpack which is required for building

`npm run dev` to build the project

## Running

open index.html in the browser, need to use a browser with webgpu support. to enable webgpu in chrome canary go to: `chrome://flags/`, search for `#enable-unsafe-webgpu` and enable it.

use the flag `--disable-dawn-features=disallow_unsafe_apis` when starting chrome canary to enable timestamps



[//]: # (Used sources: https://github.com/jack1232/WebGPU-Step-By-Step as starting point, https://github.com/alaingalvan/webgpu-seed, https://github.com/austinEng/webgpu-samples)
