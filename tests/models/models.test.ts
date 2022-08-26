import LevelDataType from '../../constants/levelDataType';
import BlockState from '../../models/blockState';
import Control from '../../models/control';
import Move from '../../models/move';
import Position from '../../models/position';
import SelectOption from '../../models/selectOption';
import SelectOptionStats from '../../models/selectOptionStats';
import SquareState from '../../models/squareState';

describe('models/*.ts', () => {
  test('SelectOption', () => {
    const selectOption = new SelectOption(
      'id',
      'text',
      'href',
      new SelectOptionStats(2, 1),
      100,
      'author',
      10,
      undefined,
      false,
      false,
    );

    const selectOptionClone = selectOption.clone();

    expect(selectOptionClone.stats).toBeDefined();

    if (selectOptionClone.stats) {
      selectOptionClone.stats.total = 3;
    }

    expect(selectOption.stats?.total).toBe(2);
  });
  test('SelectOptionStats', () => {
    const stats = new SelectOptionStats(2, 1);
    const statsClone = stats.clone();

    statsClone.total = 3;
    stats.userTotal = undefined;

    expect(statsClone.userTotal).toBe(1);
    expect(stats.total).toBe(2);
    expect(stats.getText()).toBe('/2');
    expect(statsClone.getText()).toBe('1/3');
    expect(stats.getColor('color')).toBe('color');
    expect(statsClone.getColor('color')).toBe('var(--color-incomplete)');

    statsClone.userTotal = 3;

    expect(statsClone.getColor('color')).toBe('var(--color-complete)');
  });
  test('BlockState', () => {
    const blockState = new BlockState(0, LevelDataType.NotLeft, 1, 1);

    expect(blockState.canMoveTo(new Position(1, 1))).toBe(true);
    expect(blockState.canMoveTo(new Position(0, 1))).toBe(false);
    expect(blockState.canMoveTo(new Position(2, 1))).toBe(true);
    expect(blockState.canMoveTo(new Position(1, 0))).toBe(true);
    expect(blockState.canMoveTo(new Position(1, 2))).toBe(true);
    expect(blockState.canMoveTo(new Position(-1, 1))).toBe(false);

    let blockStateClone = blockState.clone();

    expect(blockStateClone.id).toBe(0);
    blockStateClone.id = 1;
    expect(blockState.id).toBe(0);

    blockStateClone = BlockState.clone(blockState);

    expect(blockStateClone.id).toBe(0);
    blockStateClone.id = 1;
    expect(blockState.id).toBe(0);
  });
  test('Position', () => {
    const pos = new Position(1, 1);
    const posClone = pos.clone();

    expect(posClone.x).toBe(1);
    posClone.x = 2;
    expect(pos.x).toBe(1);
  });
  test('Move', () => {
    const move = new Move('code', new Position(1, 1));
    const move2 = move.clone();
    const move3 = Move.clone(move);

    expect(move2.pos.x).toBe(1);
    expect(move3.pos.x).toBe(1);
    move2.pos.x = 2;
    expect(move.pos.x).toBe(1);
    move3.pos.x = 3;
    expect(move.pos.x).toBe(1);
  });
  test('SquareState', () => {
    const s = new SquareState();
    const s2 = s.clone();
    const s3 = SquareState.clone(s);

    expect(s2.levelDataType).toBe(LevelDataType.Default);
    expect(s3.levelDataType).toBe(LevelDataType.Default);
    s2.levelDataType = LevelDataType.Block;
    expect(s.levelDataType).toBe(LevelDataType.Default);
    s3.levelDataType = LevelDataType.Wall;
    expect(s.levelDataType).toBe(LevelDataType.Default);
  });
  test('Control', () => {
    const control = new Control('id', () => { return; }, 'text', true);

    expect(control).toBeDefined();
    expect(control.id).toBe('id');
  });
});

export {};
