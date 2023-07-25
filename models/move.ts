import BlockState from './blockState';
import Position from './position';

export default class Move {
  // keycode of the move direction
  code: string;
  // position before the move
  pos: Position;
  // if a block was moved, this is its position before the move
  block: BlockState | undefined;

  constructor(code: string, pos: Position, block?: BlockState) {
    this.code = code;
    this.pos = pos.clone();
    this.block = block?.clone();
  }

  static clone(move: Move) {
    return new Move(
      move.code,
      new Position(move.pos.x, move.pos.y),
      move.block ? BlockState.clone(move.block) : undefined,
    );
  }

  clone() {
    return new Move(
      this.code,
      this.pos,
      this.block,
    );
  }
}
