import { TileType } from './tileType';

export default class levelUtil {
  static canMove(levelDataType: levelUtil) {
    return levelDataType === TileType.Block ||
      this.canMoveRestricted(levelDataType);
  }

  static canMoveRestricted(levelDataType: levelUtil) {
    return levelDataType === TileType.Left ||
      levelDataType === TileType.Up ||
      levelDataType === TileType.Right ||
      levelDataType === TileType.Down ||
      levelDataType === TileType.UpLeft ||
      levelDataType === TileType.UpRight ||
      levelDataType === TileType.DownRight ||
      levelDataType === TileType.DownLeft ||
      levelDataType === TileType.NotLeft ||
      levelDataType === TileType.NotUp ||
      levelDataType === TileType.NotRight ||
      levelDataType === TileType.NotDown ||
      levelDataType === TileType.LeftRight ||
      levelDataType === TileType.UpDown;
  }

  static canMoveLeft(levelDataType: levelUtil) {
    return levelDataType === TileType.Block ||
      levelDataType === TileType.Left ||
      levelDataType === TileType.UpLeft ||
      levelDataType === TileType.DownLeft ||
      levelDataType === TileType.NotUp ||
      levelDataType === TileType.NotRight ||
      levelDataType === TileType.NotDown ||
      levelDataType === TileType.LeftRight;
  }

  static canMoveUp(levelDataType: levelUtil) {
    return levelDataType === TileType.Block ||
      levelDataType === TileType.Up ||
      levelDataType === TileType.UpLeft ||
      levelDataType === TileType.UpRight ||
      levelDataType === TileType.NotLeft ||
      levelDataType === TileType.NotRight ||
      levelDataType === TileType.NotDown ||
      levelDataType === TileType.UpDown;
  }

  static canMoveRight(levelDataType: levelUtil) {
    return levelDataType === TileType.Block ||
      levelDataType === TileType.Right ||
      levelDataType === TileType.UpRight ||
      levelDataType === TileType.DownRight ||
      levelDataType === TileType.NotLeft ||
      levelDataType === TileType.NotUp ||
      levelDataType === TileType.NotDown ||
      levelDataType === TileType.LeftRight;
  }

  static canMoveDown(levelDataType: levelUtil) {
    return levelDataType === TileType.Block ||
      levelDataType === TileType.Down ||
      levelDataType === TileType.DownLeft ||
      levelDataType === TileType.DownRight ||
      levelDataType === TileType.NotLeft ||
      levelDataType === TileType.NotUp ||
      levelDataType === TileType.NotRight ||
      levelDataType === TileType.UpDown;
  }

  // used for the classic theme to know if a block type should have height
  static isRaised(levelDataType: levelUtil) {
    return levelDataType === TileType.Wall ||
      levelDataType === TileType.Start ||
      levelUtil.canMove(levelDataType);
  }

  // returns undefined if the string is valid, otherwise returns the invalid character
  static getInvalidLevelDataType(data: string) {
    const levelDataTypeToString = levelUtil.toString();

    for (let i = 0; i < data.length; i++) {
      if (!(data[i] in levelDataTypeToString)) {
        return data[i];
      }
    }
  }

  static toString(): { [levelDataType: string]: string; } {
    return {
      [TileType.Default]: 'Default',
      [TileType.Wall]: 'Wall',
      [TileType.Block]: 'Block',
      [TileType.End]: 'End',
      [TileType.Start]: 'Start',
      [TileType.Hole]: 'Hole',
      [TileType.Left]: 'Left',
      [TileType.Up]: 'Up',
      [TileType.Right]: 'Right',
      [TileType.Down]: 'Down',
      [TileType.UpLeft]: 'UpLeft',
      [TileType.UpRight]: 'UpRight',
      [TileType.DownRight]: 'DownRight',
      [TileType.DownLeft]: 'DownLeft',
      [TileType.NotLeft]: 'NotLeft',
      [TileType.NotUp]: 'NotUp',
      [TileType.NotRight]: 'NotRight',
      [TileType.NotDown]: 'NotDown',
      [TileType.LeftRight]: 'LeftRight',
      [TileType.UpDown]: 'UpDown',
    };
  }
}
