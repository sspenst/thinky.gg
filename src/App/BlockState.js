import LevelDataHelper from './LevelDataHelper';
import Position from './Position';

export default class BlockState {
  constructor(id, x, y, type) {
    this.id = id;
    this.pos = new Position(x, y);
    this.type = type;
  }

  canMoveTo(pos) {
    if (Position.equal(this.pos, pos)) {
      return true;
    }

    if (this.pos.x === pos.x + 1) {
      return LevelDataHelper.canMoveLeft(this.type);
    } else if (this.pos.y === pos.y + 1) {
      return LevelDataHelper.canMoveUp(this.type);
    } else if (this.pos.x === pos.x - 1) {
      return LevelDataHelper.canMoveRight(this.type);
    } else if (this.pos.y === pos.y - 1) {
      return LevelDataHelper.canMoveDown(this.type);
    }

    // can't move more than one grid space at a time
    return false;
  }
}
