import Direction, { getDirectionFromCode } from '@root/constants/direction';
import TileType from '@root/constants/tileType';
import { BlockState, cloneBlockState, cloneMove, cloneTileState, Move, TileState } from '@root/helpers/gameStateHelpers';
import { JSX } from 'react';
import TestId from '../../constants/testId';
import dbConnect, { dbDisconnect } from '../../lib/dbConnect';
import Control from '../../models/control';
import User from '../../models/db/user';
import { LevelModel, UserModel } from '../../models/mongoose';
import Position from '../../models/position';
import { calcPlayAttempts } from '../../models/schemas/levelSchema';
import SelectOptionStats from '../../models/selectOptionStats';

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
    const blockState: BlockState = {
      id: 0,
      tileType: TileType.NotLeft,
    };

    const blockState2 = cloneBlockState(blockState);

    expect(JSON.stringify(blockState2)).toBe(JSON.stringify(blockState));

    blockState2.tileType = TileType.Block;
    expect(blockState.tileType).toBe(TileType.NotLeft);
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
    const move: Move = {
      blockId: 0,
      direction: Direction.LEFT,
    };

    const move2 = cloneMove(move);

    expect(JSON.stringify(move2)).toBe(JSON.stringify(move));

    move2.direction = Direction.UP;
    expect(move.direction).toBe(Direction.LEFT);
  });
  test('TileState', () => {
    const tileState: TileState = {
      text: [],
      tileType: TileType.Default,
    };

    const tileState2 = cloneTileState(tileState);

    expect(JSON.stringify(tileState2)).toBe(JSON.stringify(tileState));

    tileState2.tileType = TileType.Block;
    expect(tileState.tileType).toBe(TileType.Default);
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
