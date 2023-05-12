## Code

This section contains a brief overview of the codebase. The application is created using TypeScript and WebGPU. The application also has a few smaller dependencies, which can be seen in `package.json`. The most significant one is probably the `3d-view-controls` library, which is used for the camera controls. Webpack is used to build the resulting site.

The source code is contained in the `src` folder. Inside the folder are a few other folders. The most important one is the folder `shaders`, which contains the WGSL shaders. The folder `data` contains a few `.xml` files which contain some chemistry definitions used by the application and two example `.pdb` files. The folder `types` contains definitions that allow us to import the various file formats like `.pdb, .wgsl, .xml` into TypeScript.

%There are several files in the repository that are not used in the final application. However, these files will not be discussed in this section.

### Layout and Style

The layout of the website is defined in the file `index.html`. It is contained in the `public` folder, which is different from the rest of the source code. 

The style for the website is defined in `style.css`.

### Typescript

These files control the CPU side of the application.

`main.ts` contains the code that interacts with the web application's UI. Additionally, this file contains the main render loop and the core logic used for it. Functions from `helper.ts` are used to create the canvas, set up the rendering context and help create different types of buffers.

Loading data files is done in `loadData.ts`. This file can load data from `.pdb` files and find the information about the atoms within them. The definition of the atom objects are in `atom.ts`. From the atoms are constructed residues (residue.ts) and from residues are constructed chains (chain.ts). When chains are constructed, additionally the bonds, which should be formed between atoms of the chain are computed. Finally, a group of chains in a single data files is aggregated into a structure (structure.ts). 

The chemistry definitions saved in the `.xml` are processed by `atomDatabase.ts` and `residueDatabase.ts`. The functions in these files can be used to find, for example, what the covalent radii of different atoms are.

From every chain is created a mesh using `chainMesh.ts`. To create this mesh, `meshHelpers.ts` is used, which constructs functions that can construct simple meshes like quads and spheres. This mesh can be rendered to create the basic sticks-and-balls visualization, or `impostorRenderer.ts` can be used to render a more effective version of the sticks-and-balls visualization which uses impostor spheres.

To create the smooth surface visualizations, first an octree needs to be created. This is done in `octree.ts`, which can create octrees and kd-esque octrees from a set of atoms. This octree is used to create a `raymarchOctreeQuad.ts`, which is used to render the smooth surfaces using raymarching.

`benchmark.ts` is used to conduct benchmarks on the application.

`wgslPreprocessor.ts` is used to remove or add lines of code from a `.wgsl` shader to enable or disable rendering features. This process is further outlined in the following section about shaders.

### Shaders

These files contain the code that is executed on the GPU. They control how the application renders the resulting image from the data prepared on the CPU.

The basic sticks-and-balls visualization uses two simple shaders. Drawing the impostor spheres on quads is done in `impostor.wgsl`. Drawing the bonds and the basic spheres is done in `basic.wgsl`.

The final shader is assembled from three `.wgsl` shader files into one file. The base shader is `raymarchOctree.wgsl`, which contains all the logic for traversing the octree and raymarching. To this shader are appended contents of `utilities.wgsl` and `drawModeDefinitions.wgsl`. The utilities file contains code for calculating the resulting colors for the various rendering and debug modes. These functions take in the information found during raymarching, for example, the color at the hit position, the normal, the distance from the camera, and outputs the final color. The draw mode definitions file contains constants, which define which number corresponds to which draw mode. These same numbers are (and need to be) in the draw mode input inside `index.html`.

In addition, a preprocessor is used to help manage the shaders. The preprocessor can disable or enable certain rendering features from the shader. As an example, the following code in the snippet will be included in the resulting shader only if the `UseCartoonEdges` flag is given. If the flag is not enabled, the code is commented out in a way that the line count stays the same, to make error messages still readable.

```
//#if UseColorByChainNumber
color = getRandomColor(floor(chainNumber));
//#endif UseColorByChainNumber
```
