import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import TestId from '@root/constants/testId';
import { TimerUtil } from '@root/helpers/getTs';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { LevelModel } from '@root/models/mongoose';
import { enableFetchMocks } from 'jest-fetch-mock';
import MockDate from 'mockdate';
import { Types } from 'mongoose';
import { checkPublishRestrictions } from '../../../../pages/api/publish/[id]';

afterEach(() => {
  jest.restoreAllMocks();
});
beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();

describe('publishLevelHandler', () => {
  test('should be OK on first publish', async () => {
    // set to one month in future
    MockDate.set(Date.now() + 1000 * 60 * 60 * 24 * 30);
    const error = await checkPublishRestrictions(DEFAULT_GAME_ID, new Types.ObjectId(TestId.USER));

    expect(error).toBeUndefined();
  });
  test('should be throttled 5 seconds after creating a level', async () => {
    // create a level

    await LevelModel.create({
      authorNote: 'YOOOOO',
      data: '4100B0\n120000\n050000\n678900\nABCD30',
      gameId: DEFAULT_GAME_ID,
      height: 5,
      isDraft: false,
      isRanked: false,
      leastMoves: 20,
      name: 'test level 100',
      slug: 'test/test-level-100',
      calc_reviews_score_laplace: 0.4,
      ts: TimerUtil.getTs(),
      userId: new Types.ObjectId(TestId.USER),
      width: 6,
    });

    MockDate.set(Date.now() + 5000);
    const error = await checkPublishRestrictions(DEFAULT_GAME_ID, new Types.ObjectId(TestId.USER));

    expect(error).toBe('Please wait a little bit before publishing another level');
  });
  test('should be OK one minute later (56 seconds later)', async () => {
    // go to 56 seconds later

    // 60 seconds later

    MockDate.set(Date.now() + 56000);

    const error = await checkPublishRestrictions(DEFAULT_GAME_ID, new Types.ObjectId(TestId.USER));

    expect(error).toBeUndefined();
  });
  test('now create some crappy levels', async () => {
    // go to 56 seconds later

    // 65 seconds later
    MockDate.set(Date.now() + 65000);
    await LevelModel.create({
      authorNote: 'YOOOOO',
      data: '4200B0\n120000\n050000\n678900\nABCD30',
      gameId: DEFAULT_GAME_ID,
      height: 5,
      isDraft: false,
      isRanked: false,
      leastMoves: 20,
      calc_reviews_score_laplace: 0.3,
      name: 'test level 101',
      slug: 'test/test-level-101',
      ts: TimerUtil.getTs(),
      userId: new Types.ObjectId(TestId.USER),
      width: 6,
    });
    MockDate.set(Date.now() + 65000);
    await LevelModel.create({
      authorNote: 'YOOOOO',
      data: '4300B0\n120000\n050000\n678900\nABCD30',
      gameId: DEFAULT_GAME_ID,
      height: 5,
      isDraft: false,
      isRanked: false,
      leastMoves: 20,
      calc_reviews_score_laplace: 0.35,
      name: 'test level 102',
      slug: 'test/test-level-102',
      ts: TimerUtil.getTs(),
      userId: new Types.ObjectId(TestId.USER),
      width: 6,
    });
    MockDate.set(Date.now() + 65000);
    await LevelModel.create({
      authorNote: 'YOOOOO',
      data: '4400B0\n120000\n050000\n678900\nABCD30',
      gameId: DEFAULT_GAME_ID,
      height: 5,
      isDraft: false,
      isRanked: false,
      leastMoves: 20,
      calc_reviews_score_laplace: 0.33,
      name: 'test level 103',
      slug: 'test/test-level-103',
      ts: TimerUtil.getTs(),
      userId: new Types.ObjectId(TestId.USER),
      width: 6,
    });
    MockDate.set(Date.now() + 65000);
    await LevelModel.create({
      authorNote: 'YOOOOO',
      data: '4500B0\n120000\n050000\n678900\nABCD30',
      gameId: DEFAULT_GAME_ID,
      height: 5,
      isDraft: false,
      isRanked: false,
      leastMoves: 20,
      calc_reviews_score_laplace: 0.31,
      name: 'test level 104',
      slug: 'test/test-level-104',
      ts: TimerUtil.getTs(),
      userId: new Types.ObjectId(TestId.USER),
      width: 6,
    });

    MockDate.set(Date.now() + 65000);

    const error = await checkPublishRestrictions(DEFAULT_GAME_ID, new Types.ObjectId(TestId.USER));

    expect(error).toBe('Your recent levels are getting poor reviews. Please wait before publishing a new level');
    // wait 25 h
    MockDate.set(Date.now() + 60000 * 60 * 12 ); // 12 hours later

    const error2 = await checkPublishRestrictions(DEFAULT_GAME_ID, new Types.ObjectId(TestId.USER));

    expect(error2).toBe('Your recent levels are getting poor reviews. Please wait before publishing a new level');
    MockDate.set(Date.now() + 60000 * 60 * 13); // 13 hours later

    const error3 = await checkPublishRestrictions(DEFAULT_GAME_ID, new Types.ObjectId(TestId.USER));

    expect(error3).toBeUndefined();
  });
  test('now create some good levels', async () => {
    // go to 56 seconds later

    // 65 seconds later
    MockDate.set(Date.now() + 65000);
    await LevelModel.create({
      authorNote: 'YOOOOO',
      data: '4210B0\n120000\n050000\n678900\nABCD30',
      gameId: DEFAULT_GAME_ID,
      height: 5,
      isDraft: false,
      isRanked: false,
      leastMoves: 20,
      calc_reviews_score_laplace: 0.63,
      name: 'test level 105',
      slug: 'test/test-level-105',
      ts: TimerUtil.getTs(),
      userId: new Types.ObjectId(TestId.USER),
      width: 6,
    });
    MockDate.set(Date.now() + 65000);
    await LevelModel.create({
      authorNote: 'YOOOOO',
      data: '4320B0\n120000\n050000\n678900\nABCD30',
      gameId: DEFAULT_GAME_ID,
      height: 5,
      isDraft: false,
      isRanked: false,
      leastMoves: 20,
      calc_reviews_score_laplace: 0.85,
      name: 'test level 106',
      slug: 'test/test-level-106',
      ts: TimerUtil.getTs(),
      userId: new Types.ObjectId(TestId.USER),
      width: 6,
    });
    MockDate.set(Date.now() + 65000);
    await LevelModel.create({
      authorNote: 'YOOOOO',
      data: '4430B0\n120000\n050000\n678900\nABCD30',
      gameId: DEFAULT_GAME_ID,
      height: 5,
      isDraft: false,
      isRanked: false,
      leastMoves: 20,
      calc_reviews_score_laplace: 0.83,
      name: 'test level 107',
      slug: 'test/test-level-107',
      ts: TimerUtil.getTs(),
      userId: new Types.ObjectId(TestId.USER),
      width: 6,
    });
    MockDate.set(Date.now() + 65000);
    await LevelModel.create({
      authorNote: 'YOOOOO',
      data: '4550B0\n120000\n050000\n678900\nABCD30',
      gameId: DEFAULT_GAME_ID,
      height: 5,
      isDraft: false,
      isRanked: false,
      leastMoves: 20,
      calc_reviews_score_laplace: 0.91,
      name: 'test level 108',
      slug: 'test/test-level-108',
      ts: TimerUtil.getTs(),
      userId: new Types.ObjectId(TestId.USER),
      width: 6,
    });

    MockDate.set(Date.now() + 65000);

    const error = await checkPublishRestrictions(DEFAULT_GAME_ID, new Types.ObjectId(TestId.USER));

    expect(error).toBeUndefined();
  });
});
