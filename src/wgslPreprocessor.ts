export function PreprocessShaderWithFlags(shader: string, flags: string[], printWarnings: boolean = true) {
    let unusedFlags: string[] = [...flags];
    let insideFlag: string[] = [];
    let lastIfLine = 0;

    let lines = shader.split("\n");
    for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
        const matchesFlags = insideFlag.every(f => flags.includes(f));
        let match;
        if ((match = lines[lineNumber].match(/^ *\/\/#if (\S+)/)) != null) {
            insideFlag.push(match[1]);
            lastIfLine = lineNumber;
            if (unusedFlags.includes(match[1])) {
                unusedFlags.splice(unusedFlags.indexOf(match[1], 1));
            }
        } else if ((match = lines[lineNumber].match(/^ *\/\/#endif (\S+)/)) != null) {
            if (insideFlag.includes(match[1])) {
                if (matchesFlags && lineNumber-1 > 0 && lines[lineNumber-1].match(/\*\//) != null) {
                    lines[lineNumber-1] = "";
                }
                insideFlag.splice(insideFlag.indexOf(match[1]), 1);
            } else if (printWarnings) {
                console.log("wgslPreprocessor Warning: #endif in line '" + lines[lineNumber] + "' doesn't have a matching starting #if");
            }
        } else {
            if (!matchesFlags && !lines[lineNumber].match(/^ *\/\//)) {
                lines[lineNumber] = "//"+lines[lineNumber];
            }
            if (lastIfLine == lineNumber-1 && insideFlag.length > 0 && matchesFlags && lines[lineNumber].match(/\/\*/) != null) {
                lines[lineNumber] = "";
            }
        }
    }

    if (printWarnings) {
        for (let i = 0; i < unusedFlags.length; i++) {
            console.log("wgslPreprocessor Warning: Flag '" + unusedFlags[i] + "' isn't used in the shader.");
        }
        for (let i = 0; i < insideFlag.length; i++) {
            console.log("wgslPreprocessor Warning: Flag '" + insideFlag[i] + "' isn't finished with an #endif.");
        }
    }

    //console.log(lines.join("\n"));
    return lines.join("\n");
}


