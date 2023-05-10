## Rendering/Debug Modes

This section documents all the rendering and debug modes available in the application.

### Default Rendering Modes

Modes that render the molecule using various types of lighting.

#### Default

The default rendering mode. No lighting is applied.

#### DefaultWithBase

In addition to the smooth molecular surface, the atoms making up the molecule are also shown inside the surface, shown as simple spheres. No lighting is applied.

#### SemiLit

Only the diffuse component of Blinn-Phong lighting (Lambertian) is used, but the diffuse lighting is shifted to make parts of the surface facing away from the light get lit. This is also known as "wrapped lighting" or "half lambert lighting".

#### Lit

The molecule is lit with the diffuse component from Blinn-Phong lighting (Lambertian) only.

#### LitGooch

The molecule is lit using Gooch shading with no specular highlights.

#### LitSpecular

The molecule is lit with both the diffuse and specular component from Blinn-Phong lighting.

#### SemiLitWithBase

A combination of SemiLit and DefaultWithBase. The atoms making up the molecule are also shown inside the surface, shown as simple spheres. Half lambert lighting is applied.

### Transparent Rendering Modes

Modes that utilize transparency. Most of these modes are computationally very expensive and will result in a large performance drop.

#### Transparent1

Monochromatic coloring, the brightness is based only on number of steps taken when inside the object. Step size when inside the volume is based on the negative distance from the volume.

#### Transparent2

Colors are based on the colors of the nearest atoms for steps which are inside the object. Step size when inside the volume is based on the negative distance from the volume.

#### Transparent3

The same as Transparent1 but brightness accumulation is reduced when close to the boundary of the volume to try prevent a fresnel like effect. Step size when inside the volume is based on the negative distance from the volume.

#### TransparentDistance

Brightness is based on the distance traveled when inside the object. Step size when inside the volume is based on the negative distance from the volume.

#### TransparentConst

A constant step size is used when inside the volume. Monochromatic coloring is used, brightness is based on the number of steps taken when inside the volume. This is the slowest option from the transparent rendering modes.

#### TransparentFake1

Transparency/thickness is estimated from potential hit information found during raytracing. This offers the best performance from the transparent modes, since it doesn't require too many additional computations compared to the default rendering modes, but has the worst accuracy. The colors are based on the color found at the first hit.

#### TransparentFake2

Same as TransparentFake1 but with monochromatic coloring.

### Debug Modes

Modes that visualize information gathered and used during the execution of the algorithm. They are aimed to help optimize the algorithm, find any potential issues, or aid in fixing bugs. Many of these modes map values to some colormap, the colormap at least for the range 0-1 can be visualized with the "Add Debug Colormap" checkbox in the color options.
 
#### Normals

Visualizes the normals computed at the position of the hit found during raymarching.

#### Depth

Shows the depth -- the distance from the camera to the hit point.

#### FirstStepDistance

Shows the distance that was traveled inside the first cell that was raymarchedfrom the initial potential hit position.

#### AllStepsDistance

Shows the distance that was traveled during raymarching from the initial potential hit position.

#### T/End

Shows the distance from the final hit position found during raymarching to the end of the octree cell inside which the raymarching process ended in.

#### Raymarched Atoms

Shows the number of atoms which were considered during raymarching.

#### Iterations

Visualizes the number of iterations/steps needed to finish raymarching.

#### Cells Raymarched

Visualizes the number of cells visited during raymarching.

#### SminBounds

Displays the bounds outside of which polynomial smooth minimum can't enlarge atoms.

#### Octree1

shows the number of ray-sphere intersections needed to find the potential hits during raytracing. Does not execute the raymarching part of the algorithm.

#### Octree2

Shows the number of octree cells that were intersected by the ray during raytracing. Does not execute the raymarching part of the algorithm.

#### Octree3

Combines the results from Octree1 and Octree2.

#### ClosestOctree

Requires the `FirstIndexBasedOnDistance` shader preprocessor flag. Shows the closest octree cell in the first layer of the octree.

#### Debug

Combines the number of ray sphere intersections, number of iterations, number of octree cells visited during raymarching and the resulting color at the hit point into a single color. The atoms making up the molecule are also shown inside the surface, shown as simple spheres.

#### SkipRCellPos0

Uses the default rendering mode, but skips the first cell in which a potential hit was found.

#### BlankRCellPos0

Uses the default rendering mode, but colors the pixels where a raymarching hit was found from the first potential hit/inside the first cell with black. The equivalent mode exists for the second cell, third cell and so on.
