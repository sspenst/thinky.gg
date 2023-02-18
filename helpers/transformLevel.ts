import Level from '../models/db/level';

// convert raw level data into array of arrays
function loadLevel(level: String) {
    const loadedLevel = level.split('\n');
    const output = Array<Array<string>>();
    for (var k in loadedLevel) {
        output[k] = [];
        const line = loadedLevel[k].split('');
        for (var j in line) {
            output[k][j] = line[j];
        }
    }
    return output;
}
// convert the array of arrays into raw level data
function exportLevel(level: Array<Array<string>>) {
    var exportedLevel = String();
    for (var k in level) {
        for (var j in level[k]) {
            exportedLevel = exportedLevel.concat(level[k][j]);
        }
        exportedLevel = exportedLevel.concat('\n');
    }
    return exportedLevel.trim();
}

// get height
export function getHeight(level: String) {
    const loadedLevel = loadLevel(level);
    return loadedLevel.length;
}
// get width
export function getWidth(level: String) {
    const loadedLevel = loadLevel(level);
    return loadedLevel[0].length;
}

// trim the walls around a level
export function trimLevel(level: String) {
    const loadedLevel = loadLevel(level);
    // check top row
    var trimTopRow = true;
    while (trimTopRow) {
        for (var k=0; k<loadedLevel[0].length; k++) {
            if (loadedLevel[0][k] != '1') {
                trimTopRow = false;
                break;
            }
        }
        if (trimTopRow) {
            loadedLevel.splice(0,1);
        }
    }
    // check bottom row
    var trimBotRow = true;
    while (trimBotRow) {
        for (var k=0; k<loadedLevel[loadedLevel.length-1].length; k++) {
            if (loadedLevel[loadedLevel.length-1][k] != '1') {
                trimBotRow = false;
                break;
            }
        }
        if (trimBotRow) {
            loadedLevel.splice(loadedLevel.length-1,1);
        }
    }
    // check left column
    var trimLeftCol = true;
    while (trimLeftCol) {
        for (var k=0; k<loadedLevel.length; k++) {
            if (loadedLevel[k][0] != '1') {
                trimLeftCol = false;
                break;
            }
        }
        if (trimLeftCol) {
            for (var k=0; k<loadedLevel.length; k++) {
                loadedLevel[k].splice(0,1);
            }
        }
    }
    // check right column
    var trimRightCol = true;
    while (trimRightCol) {
        for (var k=0; k<loadedLevel.length; k++) {
            if (loadedLevel[k][loadedLevel[k].length-1] != '1') {
                trimRightCol = false;
                break;
            }
        }
        if (trimRightCol) {
            for (var k=0; k<loadedLevel.length; k++) {
                loadedLevel[k].splice(loadedLevel[k].length-1,1);
            }
        }
    }
    return exportLevel(loadedLevel);
}

// rotate level 90 degrees clockwise
export function rotateLevelCCW(level: String) {
    const loadedLevel = loadLevel(level);
    const height = loadedLevel.length;
    const width = loadedLevel[0].length;

    const newLevel = Array<Array<string>>();
    for (var k=0; k < width; k++) {
        newLevel[k] = [];
    }
    for (var k=0; k<height; k++) {
        for (var j=0; j<width; j++) {
            newLevel[width-1-j][k] = loadedLevel[k][j];
        }
    }
    return exportLevel(newLevel);
}

// rotate level 90 degrees clockwise
export function rotateLevelCW(level: String) {
    return rotateLevelCCW(rotateLevelCCW(rotateLevelCCW(level)));
}

// flip level vertically
export function flipLevelY(level: String) {
    const loadedLevel = loadLevel(level);
    const height = loadedLevel.length;
    const width = loadedLevel[0].length;

    const newLevel = Array<Array<string>>();
    for (var k=0; k < width; k++) {
        newLevel[k] = [];
    }
    for (var k=0; k<height; k++) {
        for (var j=0; j<width; j++) {
            newLevel[width-1-k][j] = loadedLevel[k][j];
        }
    }
    return exportLevel(newLevel);
}

// flip level vertically
export function flipLevelX(level: String) {
    return rotateLevelCCW(flipLevelY(rotateLevelCW(level)));
}

// return a list of level data consisting of all 8 symmetries of the trimmed level (flip and rotate)
export function getAllLevelSymmetries(level: String) {
    const levels = Array<String>();
    var levelTransform = trimLevel(level);
    levels.push(levelTransform);
    for (var k=0; k < 3; k++) {
        levelTransform = rotateLevelCCW(levelTransform);
        levels.push(levelTransform);
    }
    levelTransform = flipLevelY(levelTransform);
    levels.push(levelTransform);
    for (var k=0; k < 3; k++) {
        levelTransform = rotateLevelCCW(levelTransform);
        levels.push(levelTransform);
    }
    return levels;
}
