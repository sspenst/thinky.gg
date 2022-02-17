import Color from '../Constants/Color';
import Creator from '../DataModels/Pathology/Creator';
import Level from '../DataModels/Pathology/Level';
import LocalStorage from '../Models/LocalStorage';

export default class LeastMovesHelper {
  static getColor(allComplete: boolean, anyComplete: boolean) {
    return allComplete ? Color.SelectComplete : anyComplete ? Color.SelectPartial : Color.TextDefault;
  }

  static creatorColors(
    creators: Creator[],
    leastMovesObj: {[creatorId: string]: {[packId: string]: {[levelId: string]: number}}})
  {
    const colors: string[] = [];

    for (let i = 0; i < creators.length; i++) {
      const creator = creators[i];

      const leastMovesCreator = leastMovesObj[creator._id];

      let allComplete = true;
      let anyComplete = false;

      const packIds = Object.keys(leastMovesCreator);
      const packColors = this.packColors(packIds, leastMovesCreator);

      for (let j = 0; j < packColors.length; j++) {
        const packColor = packColors[j];

        if (packColor === Color.TextDefault) {
          allComplete = false;
        } else if (packColor === Color.SelectComplete) {
          anyComplete = true;
        }
      }

      colors[i] = this.getColor(allComplete, anyComplete);
    }

    return colors;
  }

  static packColors(
    packIds: string[],
    leastMovesObj: {[packId: string]: {[levelId: string]: number}})
  {
    const colors: string[] = [];

    for (let i = 0; i < packIds.length; i++) {
      const leastMovesPack = leastMovesObj[packIds[i]];

      let allComplete = true;
      let anyComplete = false;

      for (const [levelId, leastMoves] of Object.entries(leastMovesPack)) {
        const moves = LocalStorage.getLevelMoves(levelId);

        if (moves === null) {
          allComplete = false;
        } else if (moves <= leastMoves) {
          anyComplete = true;
        } else {
          allComplete = false;
        }
      }

      colors[i] = this.getColor(allComplete, anyComplete);
    }
    
    return colors;
  }

  static levelColors(levels: Level[]) {
    const colors: string[] = [];

    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      const levelMoves = LocalStorage.getLevelMoves(level._id);
    
      colors[i] = levelMoves === null ? Color.TextDefault :
        levelMoves <= level.leastMoves ? Color.SelectComplete : Color.SelectPartial;
    }

    return colors;
  }
}
