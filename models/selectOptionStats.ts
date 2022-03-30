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
    return !this.userTotal ? 'var(--color)' :
      this.userTotal === this.total ? 'rgb(0 200 0)' : 'rgb(230 200 20)';
  }

  getText() {
    return `${this.userTotal === undefined ? '' : this.userTotal}/${this.total}`;
  }
}
