// convert raw level data into array of arrays
function loadLevel(level: string) {
  const loadedLevel = level.split('\n');
  const output = Array<Array<string>>();

  for (const k in loadedLevel) {
    output[k] = [];
    const line = loadedLevel[k].split('');

    for (const j in line) {
      output[k][j] = line[j];
    }
  }

  return output;
}

// convert the array of arrays into raw level data
function exportLevel(level: Array<Array<string>>) {
  let exportedLevel = String();

  for (const k in level) {
    for (const j in level[k]) {
      exportedLevel = exportedLevel.concat(level[k][j]);
    }

    exportedLevel = exportedLevel.concat('\n');
  }

  return exportedLevel.trim();
}

// get height
export function getHeight(level: string) {
  const loadedLevel = loadLevel(level);

  return loadedLevel.length;
}

// get width
export function getWidth(level: string) {
  const loadedLevel = loadLevel(level);

  return loadedLevel[0].length;
}

// trim the walls around a level
export function trimLevel(level: string) {
  const loadedLevel = loadLevel(level);

  // check top row
  let trimTopRow = true;

  while (trimTopRow) {
    for (let k = 0; k < loadedLevel[0].length; k++) {
      if (loadedLevel[0][k] != '1') {
        trimTopRow = false;
        break;
      }
    }

    if (trimTopRow) {
      loadedLevel.splice(0, 1);
    }
  }

  // check bottom row
  let trimBotRow = true;

  while (trimBotRow) {
    for (let k = 0; k < loadedLevel[loadedLevel.length - 1].length; k++) {
      if (loadedLevel[loadedLevel.length - 1][k] != '1') {
        trimBotRow = false;
        break;
      }
    }

    if (trimBotRow) {
      loadedLevel.splice(loadedLevel.length - 1, 1);
    }
  }

  // check left column
  let trimLeftCol = true;

  while (trimLeftCol) {
    for (let k = 0; k < loadedLevel.length; k++) {
      if (loadedLevel[k][0] != '1') {
        trimLeftCol = false;
        break;
      }
    }

    if (trimLeftCol) {
      for (let k = 0; k < loadedLevel.length; k++) {
        loadedLevel[k].splice(0, 1);
      }
    }
  }

  // check right column
  let trimRightCol = true;

  while (trimRightCol) {
    for (let k = 0; k < loadedLevel.length; k++) {
      if (loadedLevel[k][loadedLevel[k].length - 1] != '1') {
        trimRightCol = false;
        break;
      }
    }

    if (trimRightCol) {
      for (let k = 0; k < loadedLevel.length; k++) {
        loadedLevel[k].splice(loadedLevel[k].length - 1, 1);
      }
    }
  }

  return exportLevel(loadedLevel);
}

/* istanbul ignore next 
// Newline placeholder needed for swc: https://github.com/swc-project/jest/issues/119#issuecomment-1872581999
*/
// rotate a block 90 degrees counterclockwise
function rotateBlockCCW(block: string) {
  switch (block) {
  case '6':
    return '9';
  case '7':
    return '6';
  case '8':
    return '7';
  case '9':
    return '8';
  case 'A':
    return 'D';
  case 'B':
    return 'A';
  case 'C':
    return 'B';
  case 'D':
    return 'C';
  case 'E':
    return 'H';
  case 'F':
    return 'E';
  case 'G':
    return 'F';
  case 'H':
    return 'G';
  case 'I':
    return 'J';
  case 'J':
    return 'I';
  }

  return block;
}

/* istanbul ignore next 
// Newline placeholder needed for swc: https://github.com/swc-project/jest/issues/119#issuecomment-1872581999
*/
// flip a block vertically
function flipBlockY(block: string) {
  switch (block) {
  case '6':
    return '6';
  case '7':
    return '9';
  case '8':
    return '8';
  case '9':
    return '7';
  case 'A':
    return 'D';
  case 'B':
    return 'C';
  case 'C':
    return 'B';
  case 'D':
    return 'A';
  case 'E':
    return 'E';
  case 'F':
    return 'H';
  case 'G':
    return 'G';
  case 'H':
    return 'F';
  case 'I':
    return 'I';
  case 'J':
    return 'J';
  }

  return block;
}

// rotate level 90 degrees counterclockwise
export function rotateLevelCCW(level: string) {
  const loadedLevel = loadLevel(level);
  const height = loadedLevel.length;
  const width = loadedLevel[0].length;

  const newLevel = Array<Array<string>>();

  for (let k = 0; k < width; k++) {
    newLevel[k] = [];
  }

  for (let k = 0; k < height; k++) {
    for (let j = 0; j < width; j++) {
      newLevel[width - 1 - j][k] = rotateBlockCCW(loadedLevel[k][j]);
    }
  }

  return exportLevel(newLevel);
}

// rotate level 90 degrees clockwise
export function rotateLevelCW(level: string) {
  return rotateLevelCCW(rotateLevelCCW(rotateLevelCCW(level)));
}

// flip level vertically
export function flipLevelY(level: string) {
  const loadedLevel = loadLevel(level);
  const height = loadedLevel.length;
  const width = loadedLevel[0].length;

  const newLevel = Array<Array<string>>();

  for (let k = 0; k < height; k++) {
    newLevel[k] = [];
  }

  for (let k = 0; k < height; k++) {
    for (let j = 0; j < width; j++) {
      newLevel[height - 1 - k][j] = flipBlockY(loadedLevel[k][j]);
    }
  }

  return exportLevel(newLevel);
}

// flip level vertically
export function flipLevelX(level: string) {
  return rotateLevelCCW(flipLevelY(rotateLevelCW(level)));
}

// return a list of level data consisting of all 8 symmetries of the trimmed level (flip and rotate)
export function getAllLevelSymmetries(level: string) {
  const levels = Array<string>();

  let levelTransform = trimLevel(level);

  levels.push(levelTransform);

  for (let k = 0; k < 3; k++) {
    levelTransform = rotateLevelCCW(levelTransform);
    levels.push(levelTransform);
  }

  levelTransform = flipLevelY(levelTransform);
  levels.push(levelTransform);

  for (let k = 0; k < 3; k++) {
    levelTransform = rotateLevelCCW(levelTransform);
    levels.push(levelTransform);
  }

  return levels;
}
