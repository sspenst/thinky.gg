export default class LevelDataType {
  // PP1
  static readonly Default = '0';
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
  static readonly Upleft = 'A';
  static readonly Upright = 'B';
  static readonly Downright = 'C';
  static readonly Downleft = 'D';

  static canMove(levelDataType: LevelDataType) {
    return levelDataType === LevelDataType.Block || 
      this.canMoveRestricted(levelDataType);
  }

  static canMoveRestricted(levelDataType: LevelDataType) {
    return levelDataType === LevelDataType.Left || 
      levelDataType === LevelDataType.Up || 
      levelDataType === LevelDataType.Right || 
      levelDataType === LevelDataType.Down || 
      levelDataType === LevelDataType.Upleft || 
      levelDataType === LevelDataType.Upright || 
      levelDataType === LevelDataType.Downright || 
      levelDataType === LevelDataType.Downleft; 
  }

  static canMoveLeft(levelDataType: LevelDataType) {
    return levelDataType === LevelDataType.Block || 
      levelDataType === LevelDataType.Left ||
      levelDataType === LevelDataType.Upleft ||
      levelDataType === LevelDataType.Downleft;
  }

  static canMoveUp(levelDataType: LevelDataType) {
    return levelDataType === LevelDataType.Block || 
      levelDataType === LevelDataType.Up ||
      levelDataType === LevelDataType.Upleft ||
      levelDataType === LevelDataType.Upright;
  }

  static canMoveRight(levelDataType: LevelDataType) {
    return levelDataType === LevelDataType.Block || 
      levelDataType === LevelDataType.Right ||
      levelDataType === LevelDataType.Upright ||
      levelDataType === LevelDataType.Downright;
  }

  static canMoveDown(levelDataType: LevelDataType) {
    return levelDataType === LevelDataType.Block || 
      levelDataType === LevelDataType.Down ||
      levelDataType === LevelDataType.Downleft ||
      levelDataType === LevelDataType.Downright;
  }
}
