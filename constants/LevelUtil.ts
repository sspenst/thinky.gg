import { TileType } from './tileType';

export default class levelUtil {
  // PP1
  static readonly Default = TileType.Default;
  static readonly DefaultVisited = TileType.DefaultVisited;
  static readonly Wall = TileType.Wall;
  static readonly Block = TileType.Block;
  static readonly End = TileType.End;
  static readonly Start = TileType.Start;
  // PP2
  static readonly Hole = TileType.Hole;
  static readonly Left = TileType.Left;
  static readonly Up = TileType.Up;
  static readonly Right = TileType.Right;
  static readonly Down = TileType.Down;
  static readonly UpLeft = TileType.UpLeft;
  static readonly UpRight = TileType.UpRight;
  static readonly DownRight = TileType.DownRight;
  static readonly DownLeft = TileType.DownLeft;
  // Pathology
  static readonly NotLeft = TileType.NotLeft;
  static readonly NotUp = TileType.NotUp;
  static readonly NotRight = TileType.NotRight;
  static readonly NotDown = TileType.NotDown;
  static readonly LeftRight = TileType.LeftRight;
  static readonly UpDown = TileType.UpDown;

  static canMove(levelDataType: levelUtil) {
    return levelDataType === levelUtil.Block ||
      this.canMoveRestricted(levelDataType);
  }

  static canMoveRestricted(levelDataType: levelUtil) {
    return levelDataType === levelUtil.Left ||
      levelDataType === levelUtil.Up ||
      levelDataType === levelUtil.Right ||
      levelDataType === levelUtil.Down ||
      levelDataType === levelUtil.UpLeft ||
      levelDataType === levelUtil.UpRight ||
      levelDataType === levelUtil.DownRight ||
      levelDataType === levelUtil.DownLeft ||
      levelDataType === levelUtil.NotLeft ||
      levelDataType === levelUtil.NotUp ||
      levelDataType === levelUtil.NotRight ||
      levelDataType === levelUtil.NotDown ||
      levelDataType === levelUtil.LeftRight ||
      levelDataType === levelUtil.UpDown;
  }

  static canMoveLeft(levelDataType: levelUtil) {
    return levelDataType === levelUtil.Block ||
      levelDataType === levelUtil.Left ||
      levelDataType === levelUtil.UpLeft ||
      levelDataType === levelUtil.DownLeft ||
      levelDataType === levelUtil.NotUp ||
      levelDataType === levelUtil.NotRight ||
      levelDataType === levelUtil.NotDown ||
      levelDataType === levelUtil.LeftRight;
  }

  static canMoveUp(levelDataType: levelUtil) {
    return levelDataType === levelUtil.Block ||
      levelDataType === levelUtil.Up ||
      levelDataType === levelUtil.UpLeft ||
      levelDataType === levelUtil.UpRight ||
      levelDataType === levelUtil.NotLeft ||
      levelDataType === levelUtil.NotRight ||
      levelDataType === levelUtil.NotDown ||
      levelDataType === levelUtil.UpDown;
  }

  static canMoveRight(levelDataType: levelUtil) {
    return levelDataType === levelUtil.Block ||
      levelDataType === levelUtil.Right ||
      levelDataType === levelUtil.UpRight ||
      levelDataType === levelUtil.DownRight ||
      levelDataType === levelUtil.NotLeft ||
      levelDataType === levelUtil.NotUp ||
      levelDataType === levelUtil.NotDown ||
      levelDataType === levelUtil.LeftRight;
  }

  static canMoveDown(levelDataType: levelUtil) {
    return levelDataType === levelUtil.Block ||
      levelDataType === levelUtil.Down ||
      levelDataType === levelUtil.DownLeft ||
      levelDataType === levelUtil.DownRight ||
      levelDataType === levelUtil.NotLeft ||
      levelDataType === levelUtil.NotUp ||
      levelDataType === levelUtil.NotRight ||
      levelDataType === levelUtil.UpDown;
  }

  // used for the classic theme to know if a block type should have height
  static isRaised(levelDataType: levelUtil) {
    return levelDataType === levelUtil.Wall ||
      levelDataType === levelUtil.Start ||
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
      [levelUtil.Default]: 'Default',
      [levelUtil.Wall]: 'Wall',
      [levelUtil.Block]: 'Block',
      [levelUtil.End]: 'End',
      [levelUtil.Start]: 'Start',
      [levelUtil.Hole]: 'Hole',
      [levelUtil.Left]: 'Left',
      [levelUtil.Up]: 'Up',
      [levelUtil.Right]: 'Right',
      [levelUtil.Down]: 'Down',
      [levelUtil.UpLeft]: 'UpLeft',
      [levelUtil.UpRight]: 'UpRight',
      [levelUtil.DownRight]: 'DownRight',
      [levelUtil.DownLeft]: 'DownLeft',
      [levelUtil.NotLeft]: 'NotLeft',
      [levelUtil.NotUp]: 'NotUp',
      [levelUtil.NotRight]: 'NotRight',
      [levelUtil.NotDown]: 'NotDown',
      [levelUtil.LeftRight]: 'LeftRight',
      [levelUtil.UpDown]: 'UpDown',
    };
  }
}
