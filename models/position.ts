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

export function getDirectionFromCode(code: string) {
  if (code === 'ArrowLeft' || code === 'KeyA') {
    return new Position(-1, 0);
  } else if (code === 'ArrowUp' || code === 'KeyW') {
    return new Position(0, -1);
  } else if (code === 'ArrowRight' || code === 'KeyD') {
    return new Position(1, 0);
  } else if (code === 'ArrowDown' || code === 'KeyS') {
    return new Position(0, 1);
  } else {
    return undefined;
  }
}
