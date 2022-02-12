import SquareType from '../App/Enums/SquareType';

export default class SquareState {
  squareType: SquareType;
  text: number[];

  constructor(squareType = SquareType.Default, text: number[] = []) {
    this.squareType = squareType;
    this.text = text.slice();
  }

  clone() {
    return new SquareState(
      this.squareType,
      this.text,
    );
  }
}
