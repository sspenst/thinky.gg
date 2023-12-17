import { calculateEloChange } from '@root/pages/api/match';

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
});
