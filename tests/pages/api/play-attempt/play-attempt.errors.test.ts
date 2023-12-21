import Direction from '@root/constants/direction';
import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import { postPlayAttempt } from '@root/helpers/play-attempts/postPlayAttempt';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import TestId from '../../../../constants/testId';
import { TimerUtil } from '../../../../helpers/getTs';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { initLevel } from '../../../../lib/initializeLocalDb';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import Level from '../../../../models/db/level';
import PlayAttempt from '../../../../models/db/playAttempt';
import {
  LevelModel,
  PlayAttemptModel,
  UserModel
} from '../../../../models/mongoose';
import { AttemptContext } from '../../../../models/schemas/playAttemptSchema';
import {
  processQueueMessages,
  queueCalcPlayAttempts
} from '../../../../pages/api/internal-jobs/worker';
import handler from '../../../../pages/api/play-attempt/index';
import { putStat } from '../../../../pages/api/stats/index';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});
describe('play-attempt.errors.test.ts', () => {
  test('Doing a POST with an invalid level should error', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    const levelId = new Types.ObjectId();
    const res = await postPlayAttempt(new Types.ObjectId(TestId.USER), levelId.toString());
    const status = res.status;
    const response = res.json;

    expect(response.error).toBe(`Level ${levelId} not found`);
    expect(status).toBe(404);
  });
  test('POST with transaction error', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(PlayAttemptModel, 'findOne').mockImplementationOnce(() => {
      throw new Error('Test error');
    });
    const res = await postPlayAttempt(new Types.ObjectId(TestId.USER), TestId.LEVEL_4);

    expect(res.json.error).toBe('Error in POST play-attempt');
    expect(res.status).toBe(500);
  });

  test('calcDifficultyEstimate', async () => {
    const level = await initLevel(
      DEFAULT_GAME_ID,
      TestId.USER,
      'calcDifficultyEstimate',
      {},
      false
    );
    const promises = [];
    const items = [];

    for (let i = 0; i < 9; i++) {
      items.push({
        _id: new Types.ObjectId(),
        // half solved
        attemptContext:
            i % 2 === 0 ? AttemptContext.JUST_SOLVED : AttemptContext.UNSOLVED,
        endTime: i + 10,
        gameId: DEFAULT_GAME_ID,
        levelId: level._id,
        startTime: 0,
        updateCount: 0,
        userId: new Types.ObjectId(),
      });
    }

    promises.push(PlayAttemptModel.create(items));
    promises.push(queueCalcPlayAttempts(level._id));
    await Promise.all(promises);

    await processQueueMessages();

    const levelUpdated = await LevelModel.findById(level._id);

    expect(levelUpdated).toBeDefined();
    expect(levelUpdated?.calc_difficulty_estimate).toBe(-1);
    expect(levelUpdated?.calc_playattempts_duration_sum).toBe(126);
    expect(levelUpdated?.calc_playattempts_just_beaten_count).toBe(5);
    expect(levelUpdated?.calc_playattempts_unique_users?.length).toBe(9);

    const unsolvedUserId = new Types.ObjectId();

    // create a playattempt for the 10th unique user
    const [pa, unsolvedUsr] = await Promise.all([
      PlayAttemptModel.create({
        _id: new Types.ObjectId(),
        attemptContext: AttemptContext.UNSOLVED,
        endTime: 20,
        gameId: DEFAULT_GAME_ID,
        levelId: level._id,
        startTime: 0,
        updateCount: 0,
        userId: unsolvedUserId,
      }),
      UserModel.create({
        _id: unsolvedUserId,
        email: 'unsolved@gmail.com',
        last_visited_at: 0,
        name: 'unsolved',
        password: 'unsolved',
        score: 0,
        ts: 0,
      }),
    ]);

    await queueCalcPlayAttempts(level._id);
    await processQueueMessages();

    const levelUpdated2 = await LevelModel.findById(level._id);

    expect(levelUpdated2).toBeDefined();
    expect(levelUpdated2?.calc_difficulty_estimate).toBeCloseTo(29.2 * 1.47629);
    expect(levelUpdated2?.calc_playattempts_duration_sum).toBe(146);
    expect(levelUpdated2?.calc_playattempts_just_beaten_count).toBe(5);
    expect(levelUpdated2?.calc_playattempts_unique_users?.length).toBe(10);

    jest.spyOn(TimerUtil, 'getTs').mockReturnValue(30);
    const res = await postPlayAttempt(new Types.ObjectId(unsolvedUserId), level._id.toString());
    const status = res.status;
    const response = res.json;

    expect(response.message).toBe('updated');
    expect(status).toBe(200);

    const levelUpdated3 = await LevelModel.findById<Level>(level._id);

    expect(levelUpdated3).toBeDefined();
    expect(levelUpdated3?.calc_difficulty_estimate).toBeCloseTo(31.2 * 1.47629);
    expect(levelUpdated3?.calc_playattempts_duration_sum).toBe(156);
    expect(levelUpdated3?.calc_playattempts_just_beaten_count).toBe(5);
    expect(levelUpdated3?.calc_playattempts_unique_users?.length).toBe(10);

    jest.spyOn(TimerUtil, 'getTs').mockReturnValue(40);

    const res2 = await putStat(unsolvedUsr, [
      Direction.RIGHT,
      Direction.RIGHT,
      Direction.RIGHT,
      Direction.RIGHT,
      Direction.DOWN,
      Direction.UP,
      Direction.DOWN,
      Direction.UP,
      Direction.DOWN,
      Direction.UP,
      Direction.DOWN,
      Direction.UP,
      Direction.DOWN,
      Direction.UP,
      Direction.DOWN,
      Direction.UP,
      Direction.DOWN,
      Direction.DOWN,
      Direction.DOWN,
      Direction.DOWN,
    ], level._id.toString());

    expect(res2.status).toBe(200);

    const levelUpdated4 = await LevelModel.findById<Level>(level._id);

    expect(levelUpdated4).toBeDefined();
    expect(levelUpdated4?.calc_difficulty_estimate).toBeCloseTo(
      (166 / 6) * 1.47134
    );
    expect(levelUpdated4?.calc_playattempts_duration_sum).toBe(166);
    expect(levelUpdated4?.calc_playattempts_just_beaten_count).toBe(6);
    expect(levelUpdated4?.calc_playattempts_unique_users?.length).toBe(10);
  });
  // 1. no recent unsolved
  // 2. play
  // 3. get recent unsolved
  test('GET recent_unsolved', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            context: 'recent_unsolved',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response).toBeNull();
        expect(res.status).toBe(200);
      },
    });
    const res = await postPlayAttempt(new Types.ObjectId(TestId.USER), TestId.LEVEL_4);
    const status = res.status;
    const response = res.json;

    expect(response.message).toBe('created');
    expect(status).toBe(200);
    const res2 = await postPlayAttempt(new Types.ObjectId(TestId.USER), TestId.LEVEL_4);
    const status2 = res2.status;
    const response2 = res2.json;

    expect(response2.message).toBe('updated');
    expect(status2).toBe(200);

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            context: 'recent_unsolved',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response._id).toBe(TestId.LEVEL_4);
        expect(res.status).toBe(200);
      },
    });
  });

  test('playAttempts should not sort by _id', async () => {
    const playAttemptId1 = new Types.ObjectId();
    const playAttempt1 = {
      _id: playAttemptId1,
      attemptContext: AttemptContext.UNSOLVED,
      endTime: 10,
      gameId: DEFAULT_GAME_ID,
      levelId: new Types.ObjectId(TestId.LEVEL),
      startTime: 1,
      userId: new Types.ObjectId(TestId.USER),
    } as PlayAttempt;

    const playAttemptId2 = new Types.ObjectId();
    const playAttempt2 = {
      _id: playAttemptId2,
      attemptContext: AttemptContext.UNSOLVED,
      endTime: 30,
      gameId: DEFAULT_GAME_ID,
      levelId: new Types.ObjectId(TestId.LEVEL),
      startTime: 21,
      userId: new Types.ObjectId(TestId.USER),
    } as PlayAttempt;

    const playAttemptId3 = new Types.ObjectId();
    const playAttempt3 = {
      _id: playAttemptId3,
      attemptContext: AttemptContext.UNSOLVED,
      endTime: 20,
      gameId: DEFAULT_GAME_ID,
      levelId: new Types.ObjectId(TestId.LEVEL),
      startTime: 11,
      userId: new Types.ObjectId(TestId.USER),
    } as PlayAttempt;

    await PlayAttemptModel.create([playAttempt1, playAttempt2, playAttempt3]);

    jest.spyOn(TimerUtil, 'getTs').mockReturnValue(40);
    const res = await postPlayAttempt(new Types.ObjectId(TestId.USER), TestId.LEVEL);

    expect(res.status).toBe(200);
    expect(res.json.message).toBe('updated');
    expect(res.json.playAttempt.toString()).toStrictEqual(playAttemptId2.toString());
  });
});
