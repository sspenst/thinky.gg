import LevelDataType from './LevelDataType';

export default class LevelDataHelper {
  static canMove(levelDataType) {
    return levelDataType ===  LevelDataType.Block || 
      LevelDataHelper.canMoveRestricted(levelDataType);
  }

  static canMoveRestricted(levelDataType) {
    return levelDataType ===  LevelDataType.Left || 
      levelDataType ===  LevelDataType.Up || 
      levelDataType ===  LevelDataType.Right || 
      levelDataType ===  LevelDataType.Down || 
      levelDataType ===  LevelDataType.Upleft || 
      levelDataType ===  LevelDataType.Upright || 
      levelDataType ===  LevelDataType.Downright || 
      levelDataType ===  LevelDataType.Downleft; 
  }

  static canMoveLeft(levelDataType) {
    return levelDataType ===  LevelDataType.Block || 
      levelDataType === LevelDataType.Left ||
      levelDataType === LevelDataType.Upleft ||
      levelDataType === LevelDataType.Downleft;
  }

  static canMoveUp(levelDataType) {
    return levelDataType ===  LevelDataType.Block || 
      levelDataType === LevelDataType.Up ||
      levelDataType === LevelDataType.Upleft ||
      levelDataType === LevelDataType.Upright;
  }

  static canMoveRight(levelDataType) {
    return levelDataType ===  LevelDataType.Block || 
      levelDataType === LevelDataType.Right ||
      levelDataType === LevelDataType.Upright ||
      levelDataType === LevelDataType.Downright;
  }

  static canMoveDown(levelDataType) {
    return levelDataType ===  LevelDataType.Block || 
      levelDataType === LevelDataType.Down ||
      levelDataType === LevelDataType.Downleft ||
      levelDataType === LevelDataType.Downright;
  }
}
