export const CubeData = () =>{
    const positions = new Float32Array([
        // front
        -1, -1,  1,  
         1, -1,  1,  
         1,  1,  1,
         1,  1,  1,
        -1,  1,  1,
        -1, -1,  1,

        // right
         1, -1,  1,
         1, -1, -1,
         1,  1, -1,
         1,  1, -1,
         1,  1,  1,
         1, -1,  1,

        // back
        -1, -1, -1,
        -1,  1, -1,
         1,  1, -1,
         1,  1, -1,
         1, -1, -1,
        -1, -1, -1,

        // left
        -1, -1,  1,
        -1,  1,  1,
        -1,  1, -1,
        -1,  1, -1,
        -1, -1, -1,
        -1, -1,  1,

        // top
        -1,  1,  1,
         1,  1,  1,
         1,  1, -1,
         1,  1, -1,
        -1,  1, -1,
        -1,  1,  1,

        // bottom
        -1, -1,  1,
        -1, -1, -1,
         1, -1, -1,
         1, -1, -1,
         1, -1,  1,
        -1, -1,  1
    ]);

    const colors = new Float32Array([
        // front - blue
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,

        // right - red
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,

        //back - yellow
        1, 1, 0,
        1, 1, 0,
        1, 1, 0,
        1, 1, 0,
        1, 1, 0,
        1, 1, 0,

        //left - aqua
        0, 1, 1,
        0, 1, 1,
        0, 1, 1,
        0, 1, 1,
        0, 1, 1,
        0, 1, 1,

        // top - green
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,

        // bottom - fuchsia
        1, 0, 1,
        1, 0, 1,
        1, 0, 1,
        1, 0, 1,
        1, 0, 1,
        1, 0, 1
    ]);

    return {
        positions,
        colors
    };
}

// https://www.songho.ca/opengl/gl_sphere.html
export const CreateSphereGeometry = (radius: number, sectorCount: number, stackCount: number) => {
    let x, y, z, xy;                              // vertex position
    let nx, ny, nz, lengthInv = 1.0 / radius;     // vertex normal
    let s, t;                                     // vertex texCoord

    let sectorStep = 2 * Math.PI / sectorCount;
    let stackStep = Math.PI / stackCount;
    let sectorAngle, stackAngle;
    
    let vertices = [];

    for(let i = 0; i <= stackCount; i++)  {
        stackAngle = Math.PI / 2 - i * stackStep;        // starting from pi/2 to -pi/2
        xy = radius * Math.cos(stackAngle);             // r * cos(u)
        z = radius * Math.sin(stackAngle);              // r * sin(u)

        // add (sectorCount+1) vertices per stack
        // the first and last vertices have same position and normal, but different tex coords
        for(let j = 0; j <= sectorCount; ++j) {
            sectorAngle = j * sectorStep;           // starting from 0 to 2pi
            // vertex position (x, y, z)
            x = xy * Math.cos(sectorAngle);             // r * cos(u) * cos(v)
            y = xy * Math.sin(sectorAngle);             // r * cos(u) * sin(v)
            vertices.push(x);
            vertices.push(y);
            vertices.push(z);
            /*// normalized vertex normal (nx, ny, nz)
            nx = x * lengthInv;
            ny = y * lengthInv;
            nz = z * lengthInv;
            normals.push_back(nx);
            normals.push_back(ny);
            normals.push_back(nz);

            // vertex tex coord (s, t) range between [0, 1]
            s = (float)j / sectorCount;
            t = (float)i / stackCount;
            texCoords.push_back(s);
            texCoords.push_back(t);*/
        }
    }
    let indices = [];
    let k1, k2;
    for(let i = 0; i < stackCount; ++i) {
        k1 = i * (sectorCount + 1);     // beginning of current stack
        k2 = k1 + sectorCount + 1;      // beginning of next stack

        for(let j = 0; j < sectorCount; ++j, ++k1, ++k2)  {
            // 2 triangles per sector excluding first and last stacks
            // k1 => k2 => k1+1
            if(i != 0) {
                indices.push(k1);
                indices.push(k2);
                indices.push(k1 + 1);
            }

            // k1+1 => k2 => k2+1
            if(i != (stackCount-1)) {
                indices.push(k1 + 1);
                indices.push(k2);
                indices.push(k2 + 1);
            }
        }
    }
    let resultPositions = new Float32Array(indices.length*3);
    for (let i = 0; i < indices.length; i++) {
        const index = indices[i];
        resultPositions[i*3] = vertices[index*3];
        resultPositions[i*3+1] = vertices[index*3+1];
        resultPositions[i*3+2] = vertices[index*3+2];
    }
    return {positions: resultPositions, colors: new Float32Array(resultPositions.length).map((v) => 1)};
}