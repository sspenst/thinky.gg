import Position from '@root/models/position';

enum Direction {
  LEFT = 1,
  UP,
  RIGHT,
  DOWN,
  NONE
}

export function getDirectionFromCode(code: string) {
  if (code === 'ArrowLeft' || code === 'KeyA') {
    return Direction.LEFT;
  } else if (code === 'ArrowUp' || code === 'KeyW') {
    return Direction.UP;
  } else if (code === 'ArrowRight' || code === 'KeyD') {
    return Direction.RIGHT;
  } else if (code === 'ArrowDown' || code === 'KeyS') {
    return Direction.DOWN;
  } else {
    return undefined;
  }
}

export function directionToVector(direction: Direction) {
  switch (direction) {
  case Direction.LEFT:
    return new Position(-1, 0);
  case Direction.UP:
    return new Position(0, -1);
  case Direction.RIGHT:
    return new Position(1, 0);
  case Direction.DOWN:
    return new Position(0, 1);
  default:
    return new Position(0, 0);
  }
}

export default Direction;
