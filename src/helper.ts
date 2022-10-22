export function loadDataFromFile(dataFile, callback: (arg0: any) => void) {
    let sequences = [];
    let fileLocation = 0;
    let reader = new FileReader();
    let last = "";
    reader.onload = function (textResult) {
        let text = textResult.target.result as string;
        let lines = text.split("\n");
        let result = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let match = line.match(/ATOM +\d+ +\w+ +\w+ +\w+ +\d+ +(-?\d+\.\d+) +(-?\d+\.\d+) +(-?\d+\.\d+) +(-?\d+\.\d+) +(-?\d+\.\d+) +(\w)/);
            if (match == null) {
                continue;
            }
            result.push({x: match[1], y: match[2], z: match[3], name: match[6]});
        }
        callback(result);
    }
    reader.onerror = function (e) {
        throw ("Loading the data file failed, most likely because of how big the file is.");
    }
    reader.readAsText(dataFile, "UTF-8");
}