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

  getColor(noUserTotalColor: string) {
    return !this.userTotal ? noUserTotalColor :
      this.userTotal === this.total ? 'var(--color-complete)' : 'var(--color-incomplete)';
  }

  getText() {
    return `${this.userTotal === undefined ? '' : this.userTotal}/${this.total}`;
  }
}
