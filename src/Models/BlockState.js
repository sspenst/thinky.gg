import LevelDataHelper from '../Helpers/LevelDataHelper';
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

    if (this.pos.x - 1 === pos.x && this.pos.y === pos.y) {
      return LevelDataHelper.canMoveLeft(this.type);
    } else if (this.pos.x === pos.x && this.pos.y - 1 === pos.y) {
      return LevelDataHelper.canMoveUp(this.type);
    } else if (this.pos.x + 1 === pos.x && this.pos.y === pos.y) {
      return LevelDataHelper.canMoveRight(this.type);
    } else if (this.pos.x === pos.x && this.pos.y + 1 === pos.y) {
      return LevelDataHelper.canMoveDown(this.type);
    }

    // can't move more than one grid space at a time
    return false;
  }

  clone() {
    return new BlockState(
      this.id,
      this.pos.x,
      this.pos.y,
      this.type,
    );
  }
}
