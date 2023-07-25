import Position from './position';

export default class Move {
  // keycode of the move direction
  code: string;
  // position before the move
  pos: Position;
  // the id of the block pushed during this move
  blockId?: number;

  constructor(code: string, pos: Position, blockId?: number) {
    this.code = code;
    this.pos = pos.clone();
    this.blockId = blockId;
  }

  static clone(move: Move) {
    return new Move(
      move.code,
      new Position(move.pos.x, move.pos.y),
      move.blockId,
    );
  }

  clone() {
    return new Move(
      this.code,
      this.pos,
      this.blockId,
    );
  }
}
