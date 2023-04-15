import { TileType } from '../constants/tileType';

export default class SquareState {
  levelDataType: TileType;
  text: number[];

  constructor(levelDataType: TileType = TileType.Default, text: number[] = []) {
    this.levelDataType = levelDataType;
    this.text = text.slice();
  }

  static clone(squareState: SquareState) {
    return new SquareState(
      squareState.levelDataType,
      squareState.text.slice(),
    );
  }

  clone() {
    return new SquareState(
      this.levelDataType,
      this.text.slice(),
    );
  }
}
