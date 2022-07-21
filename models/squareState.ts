import LevelDataType from '../constants/levelDataType';

export default class SquareState {
  levelDataType: LevelDataType;
  text: number[];

  constructor(levelDataType: LevelDataType = LevelDataType.Default, text: number[] = []) {
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
