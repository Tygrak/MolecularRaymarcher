## Code

This section contains a brief overview of the codebase. The application is created using TypeScript and WebGPU. The application also has a few smaller dependencies which can be seen in `package.json`. The most significant one is probably the `3d-view-controls` library which is used for the camera controls. Webpack is used to build the resulting site.

The source code is contained in the `src` folder. Inside the folder are a few other folders. The most important one is the folder `shaders`, which contains the WGSL shaders. The folder `data` contains a few `.xml` files which contain some chemistry definitions used by the application and two example `.pdb` files. The folder `types` contains definitions that allow us to import the various file formats like `.pdb, .wgsl, .xml` into TypeScript.

#### index.html

This is the html of the web app. It is contained in the `public` folder, which is different from the rest of the source code. 

#### style.css

This is the css of the site. 

### Typescript

#### atom.ts

Contains the definition of the Atom object.

#### atomDatabase.ts

Can be used to find additional information about Atoms, uses data from the `.xml` files.

#### benchmark.ts

Used to run the benchmarks. A big part of the code related to benchmarks is still contained in `main.ts`.

#### chain.ts

Contains info about a single chain -- the residues inside it and the bonds between the atoms of the chain.

#### chainMesh.ts

Contains info about a mesh for a chain. Used for the simple sticks-and-balls model.

#### helper.ts

Has a few helper functions that help set up a canvas and a few types of WebGPU buffers, among other things.

#### impostorRenderer.ts

Is used to render the impostor spheres for atoms. The bonds are still rendered using 

### Shaders

#### raymarchOctree.wgsl

The main shader used for the final raymarching algorithm.

