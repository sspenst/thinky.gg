import LevelDataType from '../constants/levelDataType';
import Position from './position';

export default class BlockState {
  id: number;
  inHole: boolean;
  pos: Position;
  type: LevelDataType;

  constructor(id: number, type: LevelDataType, x: number, y: number, inHole = false) {
    this.id = id;
    this.pos = new Position(x, y);
    this.type = type;
    this.inHole = inHole;
  }

  canMoveTo(pos: Position) {
    if (this.pos.equals(pos)) {
      return true;
    }

    if (this.pos.x - 1 === pos.x && this.pos.y === pos.y) {
      return LevelDataType.canMoveLeft(this.type);
    } else if (this.pos.x === pos.x && this.pos.y - 1 === pos.y) {
      return LevelDataType.canMoveUp(this.type);
    } else if (this.pos.x + 1 === pos.x && this.pos.y === pos.y) {
      return LevelDataType.canMoveRight(this.type);
    } else if (this.pos.x === pos.x && this.pos.y + 1 === pos.y) {
      return LevelDataType.canMoveDown(this.type);
    }

    // can't move more than one grid space at a time
    return false;
  }

  clone() {
    return new BlockState(
      this.id,
      this.type,
      this.pos.x,
      this.pos.y,
      this.inHole,
    );
  }
}
