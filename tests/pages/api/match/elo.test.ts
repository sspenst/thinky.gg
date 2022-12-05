import { calculateEloChange } from '../../../../pages/api/match';

describe('elo testing', () => {
  test('elo same rating testing regular', async () => {
    const [eloW, eloL] = calculateEloChange(1000, 1000, false, false, 1);

    expect(eloW).toBe(10);
    expect(eloL).toBe(-10);
  });
  test('elo same rating testing both provisional', async () => {
    const [eloW, eloL] = calculateEloChange(1000, 1000, true, true, 1);

    expect(eloW).toBe(10);
    expect(eloL).toBe(-10);
  });
  test('elo same rating testing winner provisional', async () => {
    const [eloW, eloL] = calculateEloChange(1000, 1000, true, false, 1);

    expect(eloW).toBe(20);
    expect(eloL).toBe(-5);
  });
  test('elo same rating testing loser provisional', async () => {
    const [eloW, eloL] = calculateEloChange(1000, 1000, false, true, 1);

    expect(eloW).toBe(5);
    expect(eloL).toBe(-20);
  });
  test('elo same rating testing tie', async () => {
    const [eloW, eloL] = calculateEloChange(1000, 1000, false, true, 0.5);

    expect(eloW).toBe(0);
    expect(eloL).toBe(-0);
  });
  test('elo amateur vs weak and strong wins ', async () => {
    const [eloW, eloL] = calculateEloChange(1200, 1000, false, false, 1);

    expect(eloW).toBe(4.805061467040844);
    expect(eloL).toBe(-4.805061467040844);
  });
  test('elo pro vs weak and strong wins ', async () => {
    const [eloW, eloL] = calculateEloChange(1500, 1000, false, false, 1);

    expect(eloW).toBe(1.0648043040404498);
    expect(eloL).toBe(-1.0648043040404498);
  });
  test('elo pro vs weak and strong wins but loser is provisional ', async () => {
    const [eloW, eloL] = calculateEloChange(1500, 1000, false, true, 1);

    expect(eloW).toBe(0.5324021520202249);
    expect(eloL).toBe(-2.1296086080808996);
  });
  test('elo pro vs weak and strong loses ', async () => {
    const [eloW, eloL] = calculateEloChange(1500, 1000, false, false, 0);

    expect(eloW).toBe(-18.93519569595955);
    expect(eloL).toBe(18.93519569595955);
  });
  test('equal players one wins 10-1', async () => {
    const winner = 10;
    const loser = 1;
    const sum = winner + loser;
    const result = winner / sum;
    const [eloW, eloL] = calculateEloChange(1500, 1500, false, false, result, sum);

    expect(eloW).toBe(90);
    expect(eloL).toBe(-90);
  });
  test('equal players one wins 10-6', async () => {
    const winner = 10;
    const loser = 6;
    const sum = winner + loser;
    const result = winner / sum;
    const [eloW, eloL] = calculateEloChange(1500, 1500, false, false, result, sum);

    expect(eloW).toBe(40);
    expect(eloL).toBe(-40);
  });
  test('strong vs weak and strong wins at different amounts', async () => {
    let winner = 11;
    let loser = 1;
    let sum = winner + loser;
    let result = winner / sum;

    let [eloW, eloL] = calculateEloChange(1500, 1000, false, false, result, sum);

    expect(eloW).toBe(0);
    expect(eloL).toBe(7.222348351514611);

    winner = 1;
    loser = 11; // upset!
    sum = winner + loser;
    result = winner / sum;

    [eloW, eloL] = calculateEloChange(1500, 1000, false, false, result, sum);

    expect(eloW).toBe(-207.2223483515146);
    expect(eloL).toBe(207.2223483515146);

    winner = 11;
    loser = 11; // a tie!
    sum = winner + loser;
    result = winner / sum;

    [eloW, eloL] = calculateEloChange(1500, 1000, false, false, result, sum);

    expect(eloW).toBe(-196.5743053111101);
    expect(eloL).toBe(196.5743053111101);

    winner = 5;
    loser = 5; // a smaller tie!
    sum = winner + loser;
    result = winner / sum;

    [eloW, eloL] = calculateEloChange(1500, 1000, false, false, result, sum);

    expect(eloW).toBe(-89.3519569595955);
    expect(eloL).toBe(89.3519569595955);

    winner = 15;
    loser = 13; // a close game
    sum = winner + loser;
    result = winner / sum;

    [eloW, eloL] = calculateEloChange(1500, 1000, false, false, result, sum);

    expect(eloW).toBe(0);
    expect(eloL).toBe(230.18547948686742);
  });
});
