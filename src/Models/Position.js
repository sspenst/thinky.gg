export default class Position {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  clone() {
    return new Position(
      this.x,
      this.y,
    );
  }

  static equal(pos1, pos2) {
    return pos1.x === pos2.x && pos1.y === pos2.y;
  }
}
