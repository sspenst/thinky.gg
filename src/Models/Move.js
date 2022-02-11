export default class Move {
  constructor(pos, blocks = [], holePos = undefined) {
    this.pos = pos.clone();
    this.blocks = blocks;
    this.holePos = holePos;
  }

  clone() {
    return new Move(
      this.pos,
      this.blocks.map(block => block.clone()),
      this.holePos,
    );
  }
}
