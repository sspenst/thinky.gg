import TileTypeHelper from '@root/helpers/tileTypeHelper';
import TileType from '../constants/tileType';
import Position from './position';

export default class BlockState {
  id: number;
  inHole: boolean;
  pos: Position;
  type: TileType;

  constructor(id: number, type: TileType, x: number, y: number, inHole = false) {
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
      return TileTypeHelper.canMoveLeft(this.type);
    } else if (this.pos.x === pos.x && this.pos.y - 1 === pos.y) {
      return TileTypeHelper.canMoveUp(this.type);
    } else if (this.pos.x + 1 === pos.x && this.pos.y === pos.y) {
      return TileTypeHelper.canMoveRight(this.type);
    } else if (this.pos.x === pos.x && this.pos.y + 1 === pos.y) {
      return TileTypeHelper.canMoveDown(this.type);
    }

    // can't move more than one grid space at a time
    return false;
  }

  static clone(blockState: BlockState) {
    return new BlockState(
      blockState.id,
      blockState.type,
      blockState.pos.x,
      blockState.pos.y,
      blockState.inHole,
    );
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
