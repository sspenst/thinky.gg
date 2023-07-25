export default class Position {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  clone() {
    return new Position(
      this.x,
      this.y,
    );
  }

  equals(pos: Position) {
    return this.x === pos.x && this.y === pos.y;
  }

  add(pos: Position) {
    return new Position(
      this.x + pos.x,
      this.y + pos.y,
    );
  }

  sub(pos: Position) {
    return new Position(
      this.x - pos.x,
      this.y - pos.y,
    );
  }
}
