export default class LevelDataType {
  // PP1
  static readonly Default = '0';
  static readonly DefaultVisited = 'X';
  static readonly Wall = '1';
  static readonly Block = '2';
  static readonly End = '3';
  static readonly Start = '4';
  // PP2
  static readonly Hole = '5';
  static readonly Left = '6';
  static readonly Up = '7';
  static readonly Right = '8';
  static readonly Down = '9';
  static readonly UpLeft = 'A';
  static readonly UpRight = 'B';
  static readonly DownRight = 'C';
  static readonly DownLeft = 'D';
  // Pathology
  static readonly NotLeft = 'E';
  static readonly NotUp = 'F';
  static readonly NotRight = 'G';
  static readonly NotDown = 'H';
  static readonly LeftRight = 'I';
  static readonly UpDown = 'J';

  static canMove(levelDataType: LevelDataType) {
    return levelDataType === LevelDataType.Block ||
      this.canMoveRestricted(levelDataType);
  }

  static canMoveRestricted(levelDataType: LevelDataType) {
    return levelDataType === LevelDataType.Left ||
      levelDataType === LevelDataType.Up ||
      levelDataType === LevelDataType.Right ||
      levelDataType === LevelDataType.Down ||
      levelDataType === LevelDataType.UpLeft ||
      levelDataType === LevelDataType.UpRight ||
      levelDataType === LevelDataType.DownRight ||
      levelDataType === LevelDataType.DownLeft ||
      levelDataType === LevelDataType.NotLeft ||
      levelDataType === LevelDataType.NotUp ||
      levelDataType === LevelDataType.NotRight ||
      levelDataType === LevelDataType.NotDown ||
      levelDataType === LevelDataType.LeftRight ||
      levelDataType === LevelDataType.UpDown;
  }

  static canMoveLeft(levelDataType: LevelDataType) {
    return levelDataType === LevelDataType.Block ||
      levelDataType === LevelDataType.Left ||
      levelDataType === LevelDataType.UpLeft ||
      levelDataType === LevelDataType.DownLeft ||
      levelDataType === LevelDataType.NotUp ||
      levelDataType === LevelDataType.NotRight ||
      levelDataType === LevelDataType.NotDown ||
      levelDataType === LevelDataType.LeftRight;
  }

  static canMoveUp(levelDataType: LevelDataType) {
    return levelDataType === LevelDataType.Block ||
      levelDataType === LevelDataType.Up ||
      levelDataType === LevelDataType.UpLeft ||
      levelDataType === LevelDataType.UpRight ||
      levelDataType === LevelDataType.NotLeft ||
      levelDataType === LevelDataType.NotRight ||
      levelDataType === LevelDataType.NotDown ||
      levelDataType === LevelDataType.UpDown;
  }

  static canMoveRight(levelDataType: LevelDataType) {
    return levelDataType === LevelDataType.Block ||
      levelDataType === LevelDataType.Right ||
      levelDataType === LevelDataType.UpRight ||
      levelDataType === LevelDataType.DownRight ||
      levelDataType === LevelDataType.NotLeft ||
      levelDataType === LevelDataType.NotUp ||
      levelDataType === LevelDataType.NotDown ||
      levelDataType === LevelDataType.LeftRight;
  }

  static canMoveDown(levelDataType: LevelDataType) {
    return levelDataType === LevelDataType.Block ||
      levelDataType === LevelDataType.Down ||
      levelDataType === LevelDataType.DownLeft ||
      levelDataType === LevelDataType.DownRight ||
      levelDataType === LevelDataType.NotLeft ||
      levelDataType === LevelDataType.NotUp ||
      levelDataType === LevelDataType.NotRight ||
      levelDataType === LevelDataType.UpDown;
  }

  // used for the classic theme to know if a block type should have height
  static isRaised(levelDataType: LevelDataType) {
    return levelDataType === LevelDataType.Wall ||
      levelDataType === LevelDataType.Start ||
      LevelDataType.canMove(levelDataType);
  }

  // returns undefined if the string is valid, otherwise returns the invalid character
  static getInvalidLevelDataType(data: string) {
    const levelDataTypeToString = LevelDataType.toString();

    for (let i = 0; i < data.length; i++) {
      if (!(data[i] in levelDataTypeToString)) {
        return data[i];
      }
    }
  }

  static toString(): {[levelDataType: string]: string} {
    return {
      [LevelDataType.Default]: 'Default',
      [LevelDataType.Wall]: 'Wall',
      [LevelDataType.Block]: 'Block',
      [LevelDataType.End]: 'End',
      [LevelDataType.Start]: 'Start',
      [LevelDataType.Hole]: 'Hole',
      [LevelDataType.Left]: 'Left',
      [LevelDataType.Up]: 'Up',
      [LevelDataType.Right]: 'Right',
      [LevelDataType.Down]: 'Down',
      [LevelDataType.UpLeft]: 'UpLeft',
      [LevelDataType.UpRight]: 'UpRight',
      [LevelDataType.DownRight]: 'DownRight',
      [LevelDataType.DownLeft]: 'DownLeft',
      [LevelDataType.NotLeft]: 'NotLeft',
      [LevelDataType.NotUp]: 'NotUp',
      [LevelDataType.NotRight]: 'NotRight',
      [LevelDataType.NotDown]: 'NotDown',
      [LevelDataType.LeftRight]: 'LeftRight',
      [LevelDataType.UpDown]: 'UpDown',
    };
  }
}
