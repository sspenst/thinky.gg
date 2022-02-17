export default class LocalStorage {
  static trackLevelMoves(levelId: string, moves: number) {
    const levelMoves = localStorage.getItem(levelId);

    if (levelMoves === null) {
      localStorage.setItem(levelId, JSON.stringify(moves));
    } else {
      const storedMoves = JSON.parse(levelMoves);

      if (moves < storedMoves) {
        localStorage.setItem(levelId, JSON.stringify(moves));
      }
    }
  }

  static getLevelMoves(levelId: string) {
    const levelMoves = localStorage.getItem(levelId);
    return levelMoves === null ? null : JSON.parse(levelMoves);
  }
}
