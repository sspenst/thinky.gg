import { GameId } from '@root/constants/GameId';

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

  clone() {
    return new SelectOptionStats(
      this.total,
      this.userTotal,
    );
  }

  getColor(noUserTotalColor?: string, gameId?: string) {
    return !this.userTotal ? noUserTotalColor :
      this.userTotal === this.total ? 'var(--color-complete)' :
        gameId === GameId.SOKOPATH ? 'var(--color-complete)' : 'var(--color-incomplete)';
  }

  getText() {
    return `${this.userTotal === undefined ? '' : this.userTotal}/${this.total}`;
  }

  isSolved() {
    return this.userTotal === this.total;
  }
}
