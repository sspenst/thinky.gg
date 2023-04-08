export enum TileType {
  Default = '0',
  DefaultVisited = 'X',
  Wall = '1',
  Block = '2',
  End = '3',
  Start = '4',
  Hole = '5',
  Left = '6',
  Up = '7',
  Right = '8',
  Down = '9',
  UpLeft = 'A',
  UpRight = 'B',
  DownRight = 'C',
  DownLeft = 'D',
  NotLeft = 'E',
  NotUp = 'F',
  NotRight = 'G',
  NotDown = 'H',
  LeftRight = 'I',
  UpDown = 'J',
}

export default class LevelUtil {
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

  static canMove(levelDataType: LevelUtil) {
    return levelDataType === LevelUtil.Block ||
      this.canMoveRestricted(levelDataType);
  }

  static canMoveRestricted(levelDataType: LevelUtil) {
    return levelDataType === LevelUtil.Left ||
      levelDataType === LevelUtil.Up ||
      levelDataType === LevelUtil.Right ||
      levelDataType === LevelUtil.Down ||
      levelDataType === LevelUtil.UpLeft ||
      levelDataType === LevelUtil.UpRight ||
      levelDataType === LevelUtil.DownRight ||
      levelDataType === LevelUtil.DownLeft ||
      levelDataType === LevelUtil.NotLeft ||
      levelDataType === LevelUtil.NotUp ||
      levelDataType === LevelUtil.NotRight ||
      levelDataType === LevelUtil.NotDown ||
      levelDataType === LevelUtil.LeftRight ||
      levelDataType === LevelUtil.UpDown;
  }

  static canMoveLeft(levelDataType: LevelUtil) {
    return levelDataType === LevelUtil.Block ||
      levelDataType === LevelUtil.Left ||
      levelDataType === LevelUtil.UpLeft ||
      levelDataType === LevelUtil.DownLeft ||
      levelDataType === LevelUtil.NotUp ||
      levelDataType === LevelUtil.NotRight ||
      levelDataType === LevelUtil.NotDown ||
      levelDataType === LevelUtil.LeftRight;
  }

  static canMoveUp(levelDataType: LevelUtil) {
    return levelDataType === LevelUtil.Block ||
      levelDataType === LevelUtil.Up ||
      levelDataType === LevelUtil.UpLeft ||
      levelDataType === LevelUtil.UpRight ||
      levelDataType === LevelUtil.NotLeft ||
      levelDataType === LevelUtil.NotRight ||
      levelDataType === LevelUtil.NotDown ||
      levelDataType === LevelUtil.UpDown;
  }

  static canMoveRight(levelDataType: LevelUtil) {
    return levelDataType === LevelUtil.Block ||
      levelDataType === LevelUtil.Right ||
      levelDataType === LevelUtil.UpRight ||
      levelDataType === LevelUtil.DownRight ||
      levelDataType === LevelUtil.NotLeft ||
      levelDataType === LevelUtil.NotUp ||
      levelDataType === LevelUtil.NotDown ||
      levelDataType === LevelUtil.LeftRight;
  }

  static canMoveDown(levelDataType: LevelUtil) {
    return levelDataType === LevelUtil.Block ||
      levelDataType === LevelUtil.Down ||
      levelDataType === LevelUtil.DownLeft ||
      levelDataType === LevelUtil.DownRight ||
      levelDataType === LevelUtil.NotLeft ||
      levelDataType === LevelUtil.NotUp ||
      levelDataType === LevelUtil.NotRight ||
      levelDataType === LevelUtil.UpDown;
  }

  // used for the classic theme to know if a block type should have height
  static isRaised(levelDataType: LevelUtil) {
    return levelDataType === LevelUtil.Wall ||
      levelDataType === LevelUtil.Start ||
      LevelUtil.canMove(levelDataType);
  }

  // returns undefined if the string is valid, otherwise returns the invalid character
  static getInvalidLevelDataType(data: string) {
    const levelDataTypeToString = LevelUtil.toString();

    for (let i = 0; i < data.length; i++) {
      if (!(data[i] in levelDataTypeToString)) {
        return data[i];
      }
    }
  }

  static toString(): {[levelDataType: string]: string} {
    return {
      [LevelUtil.Default]: 'Default',
      [LevelUtil.Wall]: 'Wall',
      [LevelUtil.Block]: 'Block',
      [LevelUtil.End]: 'End',
      [LevelUtil.Start]: 'Start',
      [LevelUtil.Hole]: 'Hole',
      [LevelUtil.Left]: 'Left',
      [LevelUtil.Up]: 'Up',
      [LevelUtil.Right]: 'Right',
      [LevelUtil.Down]: 'Down',
      [LevelUtil.UpLeft]: 'UpLeft',
      [LevelUtil.UpRight]: 'UpRight',
      [LevelUtil.DownRight]: 'DownRight',
      [LevelUtil.DownLeft]: 'DownLeft',
      [LevelUtil.NotLeft]: 'NotLeft',
      [LevelUtil.NotUp]: 'NotUp',
      [LevelUtil.NotRight]: 'NotRight',
      [LevelUtil.NotDown]: 'NotDown',
      [LevelUtil.LeftRight]: 'LeftRight',
      [LevelUtil.UpDown]: 'UpDown',
    };
  }
}
