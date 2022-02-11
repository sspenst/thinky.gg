import Position from './Position';

export default class Move {
  constructor(pos) {
    this.pos = new Position(pos.x, pos.y);
  }

  clone() {
    return new Move(
      this.pos,
    );
  }
}
