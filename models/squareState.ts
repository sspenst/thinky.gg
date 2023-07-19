import TileType from '../constants/tileType';

export default class SquareState {
  tileType: TileType;
  text: number[];

  constructor(tileType: TileType = TileType.Default, text: number[] = []) {
    this.tileType = tileType;
    this.text = text.slice();
  }

  static clone(squareState: SquareState) {
    return new SquareState(
      squareState.tileType,
      squareState.text.slice(),
    );
  }

  clone() {
    return new SquareState(
      this.tileType,
      this.text.slice(),
    );
  }
}
