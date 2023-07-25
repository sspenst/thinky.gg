export default class Move {
  // keycode of the move direction
  code: string;
  // the id of the block pushed during this move
  blockId?: number;

  constructor(code: string, blockId?: number) {
    this.code = code;
    this.blockId = blockId;
  }

  // TODO: remove?
  static clone(move: Move) {
    return new Move(
      move.code,
      move.blockId,
    );
  }

  clone() {
    return new Move(
      this.code,
      this.blockId,
    );
  }
}
