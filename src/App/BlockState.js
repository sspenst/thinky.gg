import Position from './Position';

export default class BlockState {
  constructor(id, x, y) {
    this.id = id;
    this.pos = new Position(x, y);
  }
}
