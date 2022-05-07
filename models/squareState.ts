import LevelDataType from '../constants/levelDataType';

export default class SquareState {
  levelDataType: LevelDataType;
  text: number[];

  constructor(levelDataType: LevelDataType = LevelDataType.Default, text: number[] = []) {
    this.levelDataType = levelDataType;
    this.text = text.slice();
  }

  clone() {
    return new SquareState(
      this.levelDataType,
      this.text,
    );
  }
}
