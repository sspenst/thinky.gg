import BlockState from './blockState';
import Position from './position';

export default class Move {
  pos: Position;
  block: BlockState | undefined;
  holePos: Position | undefined;

  constructor(pos: Position, block?: BlockState, holePos?: Position) {
    this.pos = pos.clone();
    this.block = block?.clone();
    this.holePos = holePos?.clone();
  }

  clone() {
    return new Move(
      this.pos,
      this.block,
      this.holePos,
    );
  }
}
