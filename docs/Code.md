## Code

This section contains a brief overview of the codebase. The application is created using TypeScript and WebGPU. The application also has a few smaller dependencies which can be seen in `package.json`. The most significant one is probably the `3d-view-controls` library which is used for the camera controls. Webpack is used to build the resulting site.

The source code is contained in the `src` folder. Inside the folder are a few other folders. The most important one is the folder `shaders`, which contains the WGSL shaders. The folder `data` contains a few `.xml` files which contain some chemistry definitions used by the application and two example `.pdb` files. The folder `types` contains definitions that allow us to import the various file formats like `.pdb, .wgsl, .xml` into TypeScript.

A few files will not be mentioned. These files are not used in the final application.

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

Contains info about a single chain -- the residues inside it and the bonds between the atoms of the chain. Also contains the code that computes between which atoms bonds should be formed. A chain is formed from a group of residues.

#### chainMesh.ts

Contains info about a mesh for a chain. Used for the simple sticks-and-balls model.

#### helper.ts

Has a few helper functions that help set up a canvas and a few types of WebGPU buffers, among other things.

#### impostorRenderer.ts

Is used to render the impostor spheres for atoms. The bonds are not rendered using impostors.

#### loadData.ts

Loads data from .pdb, .obj and .pcd files into atoms/chains.

#### main.ts

Contains the code that interacts with the web apps UI. Additionally, contains the main render loop and logic used for it.

#### meshHelpers.ts

Used to construct simple meshes like quads and spheres. Used for the simple rasterized renderer for the sticks-and-balls model.

#### octree.ts

Constructs octrees and kd-esque octrees from atoms.

#### raymarchOctreeQuad.ts

Contains the logic used for rendering the final raymarched renders. Holds all the necessary buffers and data needed for rendering with raymarching, including the octree buffers.

#### residue.ts

Contains info about a single residue. A residue is formed from a group of atoms.

#### residueDatabase.ts

Can be used to find information about residues using the data from the `.xml` files. For example, whether a residue is a ligand or different type of residue.

#### structure.ts

Holds information about a single structure. A structure is a group of chains. A structure can be constructed from a string containing the contents of a `.pdb` (or `.obj`/`.pcd`) file. The code uses `loadData.ts` to do this. Additionally, is used to draw the structure for the simple sticks-and-balls model. 

#### wgslPreprocessor.ts

Is used to remove or add lines of code from a `.wgsl` shader to enable or disable rendering features. This process is outlined in the following section about shaders.

### Shaders

The final shader is composed from three .wgsl shader files into one file. In addition, a preprocessor is used. The preprocessor can disable or enable certain rendering features from the shader.

As an example, the following code in the snippet will be included in the resulting shader only if the `UseCartoonEdges` flag is given. IF the flag is not enabled, the code is commented out in a way that the line count stays the same, to make error messages still readable.

```
//#if UseCartoonEdges
if (accDist > 1.7) {
    resultColor -= max(f32(accDist-1.7), 0.0)*vec4(0.425, 0.425, 0.425, 0);
}
//#endif UseCartoonEdges
```


#### raymarchOctree.wgsl

The main shader used for the final raymarching algorithm. Contains all the logic for traversing the octree and raymarching.

#### utilities.wgsl

Contains code for calculating the resulting colors for the various rendering and debug modes. These functions take in the information found during raymarching, for example, the color at the hit position, the normal, the distance from the camera, and outputs the final color.

#### drawModeDefinitions.wgsl

Contains constants which define which number corresponds to which draw mode. These same numbers are (and need to be) in the draw mode input inside `index.html`.

#### basic.wgsl

Contains the shader for the basic sticks-and-balls visualization.

#### impostor.wgsl

Contains the shader for the sticks-and-balls visualization using impostor spheres drawn on quads.





