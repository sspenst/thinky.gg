export function checkValidGameState(value: unknown) {
// should be a object like
  /* { _id: string, gameState: GameState} */
  if (typeof value !== 'object') {
    return false;
  } else {
    // keys that it needs are all in interface GameState

    const gameStateKeys = ['actionCount', 'blocks', 'board', 'height', 'moveCount', 'moves', 'pos', 'width'];
    const valueKeys = Object.keys(value as { [key: string]: unknown });

    for (const key of gameStateKeys) {
      if (!valueKeys.includes(key)) {
        return false;
      }
    }

    if (valueKeys.length !== gameStateKeys.length) {
      return false;
    }
  }

  // make sure there wasn't any extra keys
  return true;
}
