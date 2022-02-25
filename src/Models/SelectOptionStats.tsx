import Color from '../Constants/Color';

export default class SelectOptionStats {
  total: number;
  userTotal: number | undefined;

  constructor(
    total: number,
    userTotal: number | undefined,
  ) {
    this.total = total;
    this.userTotal = userTotal;
  }

  getColor() {
    return !this.userTotal ? Color.TextDefault :
      this.userTotal === this.total ? Color.SelectComplete : Color.SelectPartial;
  }

  getText() {
    return `${this.userTotal === undefined ? '' : this.userTotal}/${this.total}`;
  }
}
