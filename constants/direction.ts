const enum Direction {
  Left,
  Up,
  Right,
  Down,
}

export default Direction;

export function getDirectionFromCode(code: string) {
  if (code === 'ArrowLeft' || code === 'KeyA') {
    return Direction.Left;
  } else if (code === 'ArrowUp' || code === 'KeyW') {
    return Direction.Up;
  } else if (code === 'ArrowRight' || code === 'KeyD') {
    return Direction.Right;
  } else if (code === 'ArrowDown' || code === 'KeyS') {
    return Direction.Down;
  } else {
    throw new Error(`getDirectionFromCode invalid code: ${code}`);
  }
}
