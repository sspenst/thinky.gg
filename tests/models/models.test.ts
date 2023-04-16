import TileType from '@root/constants/tileType';
import TestId from '../../constants/testId';
import dbConnect, { dbDisconnect } from '../../lib/dbConnect';
import BlockState from '../../models/blockState';
import Control from '../../models/control';
import User from '../../models/db/user';
import { LevelModel, UserModel } from '../../models/mongoose';
import Move from '../../models/move';
import Position, { getDirectionFromCode } from '../../models/position';
import { calcPlayAttempts } from '../../models/schemas/levelSchema';
import SelectOptionStats from '../../models/selectOptionStats';
import SquareState from '../../models/squareState';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});
afterEach(() => {
  jest.restoreAllMocks();
});
describe('models/*.ts', () => {
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
    const blockState = new BlockState(0, TileType.NotLeft, 1, 1);

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
  test('getDirectionFromCode', () => {
    expect(getDirectionFromCode('KeyB')).toBe(undefined);
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

    const move4 = new Move(
      'code',
      new Position(1, 1),
      new BlockState(0, TileType.Block, 0, 0),
      new Position(0, 0),
    );

    expect(move4.block?.id).toBe(0);
    expect(move4.holePos?.x).toBe(0);

    const move5 = Move.clone(move4);

    if (move5.holePos) {
      move5.holePos.x = 2;
    }

    expect(move4.holePos?.x).toBe(0);
  });
  test('SquareState', () => {
    const s = new SquareState();
    const s2 = s.clone();
    const s3 = SquareState.clone(s);

    expect(s2.levelDataType).toBe(TileType.Default);
    expect(s3.levelDataType).toBe(TileType.Default);
    s2.levelDataType = TileType.Block;
    expect(s.levelDataType).toBe(TileType.Default);
    s3.levelDataType = TileType.Wall;
    expect(s.levelDataType).toBe(TileType.Default);
  });
  test('Control', () => {
    const control = new Control('id', () => { return; }, {} as JSX.Element, true);

    expect(control).toBeDefined();
    expect(control.id).toBe('id');

    const control2 = new Control('id', () => { return; }, {} as JSX.Element);

    expect(control2.disabled).toBe(false);
  });
  test('levelSchema', async () => {
    await dbConnect();

    const level = await LevelModel.findById(TestId.LEVEL);

    await calcPlayAttempts(level._id);

    const updatedLevel = await LevelModel.findById(TestId.LEVEL);

    expect(updatedLevel.calc_playattempts_duration_sum).toBe(0);
    expect(updatedLevel.calc_difficulty_estimate).toBe(-1);
  });
  test('Verify email/password is not exposed', async () => {
    const user = await UserModel.findById<User>(TestId.USER);

    expect(user?.email).toBeUndefined();
    expect(user?.password).toBeUndefined();

    const userWithPassword = await UserModel.findById<User>(TestId.USER, '+email +password');

    expect(userWithPassword?.email).toBeDefined();
    expect(userWithPassword?.password).toBeDefined();
  });
});

export {};
