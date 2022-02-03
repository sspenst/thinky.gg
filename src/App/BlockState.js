import LevelDataType from './LevelDataType';
import Position from './Position';

export default class BlockState {
  constructor(id, x, y, type) {
    this.id = id;
    this.pos = new Position(x, y);
    this.type = type;
  }

  canMove(pos) {
    if (this.type === LevelDataType.Block) {
      return true;
    }

    if (this.pos.x > pos.x) {
      return BlockState.canMoveLeft(this.type);
    } else if (this.pos.y > pos.y) {
      return BlockState.canMoveUp(this.type);
    } else if (this.pos.x < pos.x) {
      return BlockState.canMoveRight(this.type);
    } else if (this.pos.y < pos.y) {
      return BlockState.canMoveDown(this.type);
    }

    return true;
  }

  static canMoveLeft(levelDataType) {
    return levelDataType === LevelDataType.Left ||
      levelDataType === LevelDataType.Upleft ||
      levelDataType === LevelDataType.Downleft;
  }

  static canMoveUp(levelDataType) {
    return levelDataType === LevelDataType.Up ||
      levelDataType === LevelDataType.Upleft ||
      levelDataType === LevelDataType.Upright;
  }

  static canMoveRight(levelDataType) {
    return levelDataType === LevelDataType.Right ||
      levelDataType === LevelDataType.Upright ||
      levelDataType === LevelDataType.Downright;
  }

  static canMoveDown(levelDataType) {
    return levelDataType === LevelDataType.Down ||
      levelDataType === LevelDataType.Downleft ||
      levelDataType === LevelDataType.Downright;
  }
}
