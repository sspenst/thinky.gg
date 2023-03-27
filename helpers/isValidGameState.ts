export function isValidGameState(value: unknown) {
  if (typeof value !== 'object') {
    return false;
  }

  // keys that it needs are all in interface GameState
  const gameStateKeys = ['actionCount', 'blocks', 'board', 'height', 'moveCount', 'moves', 'pos', 'width'];
  const valueKeys = Object.keys(value as { [key: string]: unknown });

  for (const key of gameStateKeys) {
    if (!valueKeys.includes(key)) {
      return false;
    }
  }

  // make sure there aren't any extra keys
  if (valueKeys.length !== gameStateKeys.length) {
    return false;
  }

  return true;
}
