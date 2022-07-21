import BlockState from './blockState';
import Position from './position';

export default class Move {
  code: string;
  pos: Position;
  block: BlockState | undefined;
  holePos: Position | undefined;

  constructor(code: string, pos: Position, block?: BlockState, holePos?: Position) {
    this.code = code;
    this.pos = pos.clone();
    this.block = block?.clone();
    this.holePos = holePos?.clone();
  }

  static clone(move: Move) {
    return new Move(
      move.code,
      new Position(move.pos.x, move.pos.y),
      move.block ? BlockState.clone(move.block) : undefined,
      move.holePos ? new Position(move.holePos.x, move.holePos.y) : undefined,
    );
  }

  clone() {
    return new Move(
      this.code,
      this.pos,
      this.block,
      this.holePos,
    );
  }
}
