export default class Square {
  constructor(squareType, text) {
    this.squareType = squareType;
    this.text = text;
  }

  clone() {
    return new Square(
      this.squareType,
      this.text.slice(),
    );
  }
}
