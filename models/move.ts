import Direction from '@root/constants/direction';
import Position from './position';

export default class Move {
  direction: Direction;
  // position before the move
  pos: Position;
  // the id of the block pushed during this move
  blockId?: number;

  constructor(direction: Direction, pos: Position, blockId?: number) {
    this.direction = direction;
    this.pos = pos.clone();
    this.blockId = blockId;
  }

  static clone(move: Move) {
    return new Move(
      move.direction,
      new Position(move.pos.x, move.pos.y),
      move.blockId,
    );
  }

  clone() {
    return new Move(
      this.direction,
      this.pos,
      this.blockId,
    );
  }
}
