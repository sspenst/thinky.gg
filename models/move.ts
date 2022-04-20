import BlockState from './blockState';
import Direction from '../constants/direction';
import Position from './position';

export default class Move {
  direction: Direction;
  pos: Position;
  block: BlockState | undefined;
  holePos: Position | undefined;

  constructor(direction: Direction, pos: Position, block?: BlockState, holePos?: Position) {
    this.direction = direction;
    this.pos = pos.clone();
    this.block = block?.clone();
    this.holePos = holePos?.clone();
  }

  clone() {
    return new Move(
      this.direction,
      this.pos,
      this.block,
      this.holePos,
    );
  }
}
