import Color from '../Constants/Color';

export default class SelectOptionStats {
  total: number;
  userTotal: number | null;

  constructor(
    total: number,
    userTotal: number | null,
  ) {
    this.total = total;
    this.userTotal = userTotal;
  }

  getColor() {
    return this.userTotal === null || this.userTotal === 0 ? Color.TextDefault :
      this.userTotal === this.total ? Color.SelectComplete : Color.SelectPartial;
  }

  getText() {
    return `${this.userTotal === null ? '' : this.userTotal}/${this.total}`;
  }
}
