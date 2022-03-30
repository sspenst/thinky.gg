import BlockState from './blockState';
import Position from './position';

export default class Move {
  pos: Position;
  blocks: BlockState[];
  holePos: Position | undefined;

  constructor(pos: Position, blocks: BlockState[] = [], holePos: Position | undefined = undefined) {
    this.pos = pos.clone();
    this.blocks = blocks.map(block => block.clone());
    this.holePos = holePos === undefined ? undefined : holePos.clone();
  }

  clone() {
    return new Move(
      this.pos,
      this.blocks,
      this.holePos,
    );
  }
}
