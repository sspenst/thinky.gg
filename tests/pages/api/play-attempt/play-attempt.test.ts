import Direction from '@root/constants/direction';
import { enableFetchMocks } from 'jest-fetch-mock';
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
import Stat from '../../../../models/db/stat';
import { LevelModel, PlayAttemptModel, RecordModel, StatModel, UserModel } from '../../../../models/mongoose';
import { AttemptContext } from '../../../../models/schemas/playAttemptSchema';
import { processQueueMessages, queueCalcPlayAttempts, queueRefreshIndexCalcs } from '../../../../pages/api/internal-jobs/worker';
import handler, { getLastLevelPlayed } from '../../../../pages/api/play-attempt/index';
import statsHandler from '../../../../pages/api/stats/index';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});
afterEach(() => {
  jest.restoreAllMocks();
});
enableFetchMocks();

const MINUTE = 60;

interface PlayAttemptTest {
  levelId: string;
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  list: any[];
  tests: (playAttemptDocs: PlayAttempt[], statDocs: Stat[], lvl: Level) => Promise<void>;
}

/**
 * notes:
 * - LEVEL and LEVEL_4 are used in these tests
 * - both start with a leastMoves of 20
 * - USER created LEVEL, USER_B created LEVEL_4
 */

const tests = [
  {
    levelId: TestId.LEVEL_4,
    name: 'play at 5 min for 4 min',
    list: [
      ['play', 5 * MINUTE, 'created'],
      ['play', 6 * MINUTE, 'updated'],
      ['play', 7 * MINUTE, 'updated'],
      ['play', 9 * MINUTE, 'updated'],
    ],
    tests: async (playAttemptDocs: PlayAttempt[], statDocs: Stat[], lvl: Level) => {
      expect(lvl.calc_playattempts_duration_sum).toBe(4 * MINUTE);
      expect(playAttemptDocs.length).toBe(1);
      expect(playAttemptDocs[0].attemptContext).toBe(AttemptContext.UNSOLVED);
      expect(playAttemptDocs[0].updateCount).toBe(3);
      expect(lvl.calc_playattempts_unique_users).toStrictEqual([new Types.ObjectId(TestId.USER)]);
      expect(lvl.calc_playattempts_just_beaten_count).toBe(0);
    }
  },
  {
    levelId: TestId.LEVEL_4,
    name: 'play regular',
    list: [
      ['play', 0, 'created'],
      ['play', 2 * MINUTE, 'updated'],
      ['play', 34 * MINUTE, 'created'],
    ],
    tests: async (playAttemptDocs: PlayAttempt[], statDocs: Stat[], lvl: Level) => {
      expect(lvl.calc_playattempts_duration_sum).toBe(2 * MINUTE);
      expect(playAttemptDocs.length).toBe(2);
      expect(playAttemptDocs[0].attemptContext).toBe(AttemptContext.UNSOLVED);
      expect(playAttemptDocs[0].updateCount).toBe(0);
      expect(playAttemptDocs[1].attemptContext).toBe(AttemptContext.UNSOLVED);
      expect(playAttemptDocs[1].updateCount).toBe(1);
    }
  },
  {
    levelId: TestId.LEVEL_4,
    name: 'don\'t play',
    list: [
      ['play', 0, 'created'],
    ],
    tests: async (playAttemptDocs: PlayAttempt[], statDocs: Stat[], lvl: Level) => {
      expect(lvl.calc_playattempts_duration_sum).toBe(0);
      expect(lvl.calc_playattempts_unique_users).toStrictEqual([]);
      expect(playAttemptDocs.length).toBe(1);
      expect(playAttemptDocs[0].attemptContext).toBe(AttemptContext.UNSOLVED);
      expect(playAttemptDocs[0].updateCount).toBe(0);
    }
  },
  {
    levelId: TestId.LEVEL_4,
    name: 'play at 14m for 3m, come back 1m later and then play for 3m',
    list: [
      ['play', 14 * MINUTE, 'created'],
      ['play', 15 * MINUTE, 'updated'],
      ['play', 16 * MINUTE, 'updated'],
      ['play', 17 * MINUTE, 'updated'],
    ],
    tests: async (playAttemptDocs: PlayAttempt[], statDocs: Stat[], lvl: Level) => {
      expect(playAttemptDocs.length).toBe(1);
      expect(playAttemptDocs[0].attemptContext).toBe(AttemptContext.UNSOLVED);
      expect(playAttemptDocs[0].updateCount).toBe(3);
      expect(lvl.calc_playattempts_duration_sum).toBe(3 * MINUTE);
      expect(lvl.calc_playattempts_unique_users).toStrictEqual([new Types.ObjectId(TestId.USER)]);
      expect(lvl.calc_playattempts_just_beaten_count).toBe(0);
    }
  },
  {
    levelId: TestId.LEVEL_4,
    name: 'play. dont win. come back and play. win. play a bit. leave. then come back and play',
    list: [
      ['play', 0, 'created'],
      ['play', 1 * MINUTE, 'updated'],
      ['play', 2 * MINUTE, 'updated'], // total = 2
      ['play', 22 * MINUTE, 'created'],
      ['play', 23 * MINUTE, 'updated'],
      ['win_10', 24 * MINUTE, 'ok'], // total = 2 + (24-22) = 4
      ['play', 25 * MINUTE, 'created'],
      ['play', 26 * MINUTE, 'updated'],
      ['play', 27 * MINUTE, 'updated'],
      ['win_8', 28 * MINUTE, 'ok'], // total = 4 + (28-25) = 7
      ['play', 29 * MINUTE, 'created'],
      ['play', 30 * MINUTE, 'updated'],
      ['play', 50 * MINUTE, 'created'],
      ['play', 51 * MINUTE, 'updated'],
      ['play', 52 * MINUTE, 'updated'],
    ],
    tests: async (playAttemptDocs: PlayAttempt[], statDocs: Stat[], lvl: Level) => {
      expect(lvl.calc_playattempts_just_beaten_count).toBe(1);
      expect(lvl.calc_playattempts_duration_sum).toBe(7 * MINUTE);

      expect(playAttemptDocs.length).toBe(5);
      expect(playAttemptDocs[0].updateCount).toBe(2);
      expect(playAttemptDocs[0].attemptContext).toBe(AttemptContext.SOLVED);
      expect(playAttemptDocs[1].updateCount).toBe(1);
      expect(playAttemptDocs[1].attemptContext).toBe(AttemptContext.SOLVED);
      expect(playAttemptDocs[2].updateCount).toBe(3);
      expect(playAttemptDocs[2].attemptContext).toBe(AttemptContext.JUST_SOLVED);
      expect(playAttemptDocs[3].updateCount).toBe(2);
      expect(playAttemptDocs[3].attemptContext).toBe(AttemptContext.UNSOLVED);
      expect(playAttemptDocs[4].updateCount).toBe(2);
      expect(playAttemptDocs[4].attemptContext).toBe(AttemptContext.UNSOLVED);
      expect(lvl.calc_playattempts_unique_users).toStrictEqual([new Types.ObjectId(TestId.USER)]);
      expect(lvl.calc_playattempts_just_beaten_count).toBe(1);
    }
  },
  {
    levelId: TestId.LEVEL_4,
    name: 'win right away then return 25 minutes later for a moment',
    list: [
      ['play', 0, 'created'],
      ['play', 1 * MINUTE, 'updated'],
      ['win_8', 1 * MINUTE, ''],
      ['play', 25 * MINUTE, 'created'],
    ],
    tests: async (playAttemptDocs: PlayAttempt[], statDocs: Stat[], lvl: Level) => {
      expect(lvl.calc_playattempts_duration_sum).toBe(1 * MINUTE );
      expect(lvl.calc_playattempts_just_beaten_count).toBe(1);
      expect(playAttemptDocs.length).toBe(2);
      expect(playAttemptDocs[0].attemptContext).toBe(AttemptContext.SOLVED);
      expect(playAttemptDocs[0].updateCount).toBe(0);
      expect(playAttemptDocs[1].attemptContext).toBe(AttemptContext.JUST_SOLVED);
      expect(playAttemptDocs[1].updateCount).toBe(2);
    }
  },
  {
    levelId: TestId.LEVEL_4,
    name: 'win right away then continue to play',
    list: [
      ['play', 0, 'created'],
      ['play', 1 * MINUTE, 'updated'], // sum = 1
      ['win_8', 2 * MINUTE, 'ok'], // sum = 1+1 = 2
      ['play', 3 * MINUTE, 'created'],
      ['play', 4 * MINUTE, 'updated'],
      ['play', 20 * MINUTE, 'created'],
      ['play', 21 * MINUTE, 'updated'],
    ],
    tests: async (playAttemptDocs: PlayAttempt[], statDocs: Stat[], lvl: Level) => {
      expect(lvl.calc_playattempts_duration_sum).toBe(2 * MINUTE);
      expect(playAttemptDocs.length).toBe(3);
      expect(playAttemptDocs[0].updateCount).toBe(1);
      expect(playAttemptDocs[0].attemptContext).toBe(AttemptContext.SOLVED);
      expect(playAttemptDocs[1].updateCount).toBe(1);
      expect(playAttemptDocs[1].attemptContext).toBe(AttemptContext.SOLVED);
      expect(playAttemptDocs[2].updateCount).toBe(2);
      expect(playAttemptDocs[2].attemptContext).toBe(AttemptContext.JUST_SOLVED);
      expect(lvl.calc_playattempts_just_beaten_count).toBe(1);
    }
  },
  {
    levelId: TestId.LEVEL_4,
    name: 'win right away but then a record comes in way later',
    list: [
      ['play', 0, 'created'],
      ['win_10', 0.1 * MINUTE, 'ok'],
      ['b_win_8', 100 * MINUTE, ''],
    ],
    tests: async (playAttemptDocs: PlayAttempt[], statDocs: Stat[], lvl: Level,) => {
      expect(playAttemptDocs.length).toBe(2);
      expect(playAttemptDocs[0].updateCount).toBe(0);
      expect(playAttemptDocs[0].attemptContext).toBe(AttemptContext.JUST_SOLVED);
      expect(playAttemptDocs[0].userId._id.toString()).toBe(TestId.USER_B);
      expect(playAttemptDocs[1].updateCount).toBe(1);
      expect(playAttemptDocs[1].attemptContext).toBe(AttemptContext.UNSOLVED);
      expect(playAttemptDocs[1].userId._id.toString()).toBe(TestId.USER);
      expect(lvl.calc_playattempts_unique_users).toStrictEqual([new Types.ObjectId(TestId.USER), new Types.ObjectId(TestId.USER_B)]);
      expect(lvl.calc_playattempts_just_beaten_count).toBe(1); // other person solved
    }
  },
  {
    levelId: TestId.LEVEL_4,
    name: 'win right away but then a record comes in way later then you match the record',
    list: [
      ['play', 0, 'created'],
      ['win_10', 0.1 * MINUTE, 'ok'],
      ['b_win_8', 1 * MINUTE, ''],
      ['play', 2 * MINUTE, 'updated'],
      ['win_8', 3 * MINUTE, ''],
    ],
    tests: async (playAttemptDocs: PlayAttempt[], statDocs: Stat[], lvl: Level) => {
      expect(playAttemptDocs.length).toBe(2);
      expect(playAttemptDocs[0].updateCount).toBe(0);
      expect(playAttemptDocs[0].attemptContext).toBe(AttemptContext.JUST_SOLVED);
      expect(playAttemptDocs[0].userId.toString()).toBe(TestId.USER_B);
      expect(playAttemptDocs[1].updateCount).toBe(3);
      expect(playAttemptDocs[1].attemptContext).toBe(AttemptContext.JUST_SOLVED);
      expect(playAttemptDocs[1].userId.toString()).toBe(TestId.USER);
      expect(lvl.calc_playattempts_just_beaten_count).toBe(2);
    }
  },
  {
    levelId: TestId.LEVEL_4,
    name: 'win right away, a record comes in way later, come back and play for a while, give up, then come back and play again and win, then come back a way later and then play',
    list: [
      ['play', 0, 'created'], //
      ['play', 1 * MINUTE, 'updated'], // sum =1
      ['play', 2 * MINUTE, 'updated'], // sum =2
      ['play', 3 * MINUTE, 'updated'], // sum =3
      ['play', 4 * MINUTE, 'updated'], // sum =4
      ['play', 5 * MINUTE, 'updated'], // sum =5
      ['play', 35 * MINUTE, 'created'], // sum += 0 since it's a new play with no play attempts before or after...
      ['win_10', 100 * MINUTE, 'ok'], // 5+0
      ['b_win_8', 200 * MINUTE, ''], // 5+0
      ['play', 250 * MINUTE, 'created'], // 5+0
      ['play', 251 * MINUTE, 'updated'], // 5+1  = 6
      ['play', 252 * MINUTE, 'updated'], // sum+=256-250 = 6. Sum should now be +1 = 7
      ['play', 253 * MINUTE, 'updated'], // sum+=256-250 = 6. Sum should now be +1 = 8
      ['play', 254 * MINUTE, 'updated'], // sum+=256-250 = 6. Sum should now be +1 = 9
      ['play', 255 * MINUTE, 'updated'], // sum+=256-250 = 6. Sum should now be +1 = 10
      ['play', 256 * MINUTE, 'updated'], // sum+=256-250 = 6. Sum should now be +1 = 11
      ['play', 300 * MINUTE, 'created'],
      ['play', 302 * MINUTE, 'updated'],
      ['win_8', 302.5 * MINUTE, ''], //// sum+=(302.5-300) = 2.5. Sum should now be 11+2.5 = 13.5!
      ['play', 345 * MINUTE, 'created'],
    ],
    tests: async (playAttemptDocs: PlayAttempt[], statDocs: Stat[], lvl: Level) => {
      expect(playAttemptDocs.length).toBe(7);
      expect(playAttemptDocs[0].attemptContext).toBe(AttemptContext.SOLVED);
      expect(playAttemptDocs[1].attemptContext).toBe(AttemptContext.JUST_SOLVED);
      expect(playAttemptDocs[2].attemptContext).toBe(AttemptContext.UNSOLVED);
      expect(playAttemptDocs[3].attemptContext).toBe(AttemptContext.JUST_SOLVED);
      expect(playAttemptDocs[4].attemptContext).toBe(AttemptContext.UNSOLVED);
      expect(playAttemptDocs[5].attemptContext).toBe(AttemptContext.UNSOLVED);
      expect(playAttemptDocs[6].attemptContext).toBe(AttemptContext.UNSOLVED);

      expect(playAttemptDocs[0].endTime).toBe(345 * MINUTE);
      expect(playAttemptDocs[0].startTime).toBe(345 * MINUTE);

      expect(playAttemptDocs[1].endTime).toBe(302.5 * MINUTE);
      expect(playAttemptDocs[1].startTime).toBe(300 * MINUTE);

      expect(playAttemptDocs[2].endTime).toBe(256 * MINUTE);
      expect(playAttemptDocs[2].startTime).toBe(250 * MINUTE);

      expect(playAttemptDocs[3].endTime).toBe(200 * MINUTE);
      expect(playAttemptDocs[3].startTime).toBe(200 * MINUTE);

      expect(playAttemptDocs[4].endTime).toBe(100 * MINUTE);
      expect(playAttemptDocs[4].startTime).toBe(100 * MINUTE);

      expect(playAttemptDocs[5].endTime).toBe(35 * MINUTE);
      expect(playAttemptDocs[5].startTime).toBe(35 * MINUTE);

      expect(playAttemptDocs[6].endTime).toBe(5 * MINUTE);
      expect(playAttemptDocs[6].startTime).toBe(0);

      expect(lvl.calc_playattempts_duration_sum).toBe(13.5 * MINUTE); // see comments above on how this is calculated
      expect(lvl.calc_playattempts_unique_users).toHaveLength(2);
      expect(lvl.calc_playattempts_just_beaten_count).toBe(2);
      expect(lvl.calc_playattempts_just_beaten_count).toBe(2); // both of us solved it
    }
  },
  {
    levelId: TestId.LEVEL_4,
    name: 'win right away but never send a playattempt (unlikely but possible)',
    list: [
      ['win_10', 6, 'ok'],
    ],
    tests: async (playAttemptDocs: PlayAttempt[], statDocs: Stat[], lvl: Level) => {
      expect(playAttemptDocs.length).toBe(1);
      expect(playAttemptDocs[0].attemptContext).toBe(AttemptContext.JUST_SOLVED);
      expect(playAttemptDocs[0].startTime).toBe(0.1 * MINUTE);
      expect(playAttemptDocs[0].endTime).toBe(0.1 * MINUTE);
      expect(lvl.calc_playattempts_duration_sum).toBe(0);
      expect(lvl.calc_playattempts_just_beaten_count).toBe(1);
    }
  },
  {
    levelId: TestId.LEVEL_4,
    name: 'win immediately then check last level played (can occur on 1 step levels)',
    list: [
      ['win_10', 1 * MINUTE, 'ok'],
      ['play', 1 * MINUTE, 'created'],
    ],
    tests: async (playAttemptDocs: PlayAttempt[], statDocs: Stat[], lvl: Level) => {
      expect(playAttemptDocs.length).toBe(2);
      expect(playAttemptDocs[0].attemptContext).toBe(AttemptContext.SOLVED);
      expect(playAttemptDocs[0].startTime).toBe(MINUTE);
      expect(playAttemptDocs[0].endTime).toBe(MINUTE);
      expect(playAttemptDocs[1].attemptContext).toBe(AttemptContext.JUST_SOLVED);
      expect(playAttemptDocs[1].startTime).toBe(MINUTE);
      expect(playAttemptDocs[1].endTime).toBe(MINUTE);
      expect(lvl.calc_playattempts_duration_sum).toBe(0);
      expect(lvl.calc_playattempts_just_beaten_count).toBe(1);

      const user = await UserModel.findById(TestId.USER);
      const lastLevelPlayed = await getLastLevelPlayed(user);

      expect(lastLevelPlayed?._id.toString()).toBe(TestId.LEVEL_4);
    }
  },
  {
    levelId: TestId.LEVEL_4,
    name: 'dont win, come back 1 hour later and win without sending playattempt (rare but has happened)',
    list: [
      ['play', 0, 'created'],
      ['win_8', 60 * MINUTE, 'created']
    ],
    tests: async (playAttemptDocs: PlayAttempt[], statDocs: Stat[], lvl: Level) => {
      expect(playAttemptDocs[0].attemptContext).toBe(AttemptContext.JUST_SOLVED);
      expect(playAttemptDocs.length).toBe(2);

      expect(playAttemptDocs[0].startTime).toBe(3600);
      expect(playAttemptDocs[0].endTime).toBe(3600);
      expect(playAttemptDocs[0].updateCount).toBe(0);

      expect(playAttemptDocs[1].startTime).toBe(0);
      expect(playAttemptDocs[1].endTime).toBe(0);
      expect(playAttemptDocs[1].updateCount).toBe(0);
      expect(lvl.calc_playattempts_duration_sum).toBe(0);
      expect(lvl.calc_playattempts_just_beaten_count).toBe(1);
    }
  },
  {
    levelId: TestId.LEVEL,
    name: 'play own level',
    list: [
      ['play', 1 * MINUTE, 'created'],
      ['play', 2 * MINUTE, 'updated'],
      ['play', 3 * MINUTE, 'updated'],
      ['play', 22 * MINUTE, 'created'],
      ['play', 23 * MINUTE, 'updated'],
    ],
    tests: async (playAttemptDocs: PlayAttempt[], statDocs: Stat[], lvl: Level) => {
      expect(lvl.calc_playattempts_just_beaten_count).toBe(0);
      expect(lvl.calc_playattempts_duration_sum).toBe(0);
      expect(lvl.calc_playattempts_unique_users).toStrictEqual([]);

      expect(playAttemptDocs.length).toBe(2);
      expect(playAttemptDocs[0].updateCount).toBe(1);
      expect(playAttemptDocs[0].attemptContext).toBe(AttemptContext.SOLVED);
      expect(playAttemptDocs[1].updateCount).toBe(2);
      expect(playAttemptDocs[1].attemptContext).toBe(AttemptContext.SOLVED);
    }
  },
  {
    levelId: TestId.LEVEL,
    name: 'set a record on own level after a while',
    list: [
      ['play', 1 * MINUTE, 'created'],
      ['play', 2 * MINUTE, 'updated'],
      ['play', 3 * MINUTE, 'updated'],
      ['play', 22 * MINUTE, 'created'],
      ['play', 23 * MINUTE, 'updated'],
      ['win_8', 24 * MINUTE, 'ok'],
      ['play', 25 * MINUTE, 'created'],
      ['play', 26 * MINUTE, 'updated'],
    ],
    tests: async (playAttemptDocs: PlayAttempt[], statDocs: Stat[], lvl: Level) => {
      expect(lvl.calc_playattempts_just_beaten_count).toBe(1);
      expect(lvl.calc_playattempts_duration_sum).toBe(4 * MINUTE);

      expect(playAttemptDocs.length).toBe(3);
      expect(playAttemptDocs[0].updateCount).toBe(1);
      expect(playAttemptDocs[0].attemptContext).toBe(AttemptContext.SOLVED);
      expect(playAttemptDocs[1].updateCount).toBe(2);
      expect(playAttemptDocs[1].attemptContext).toBe(AttemptContext.JUST_SOLVED);
      expect(playAttemptDocs[2].updateCount).toBe(2);
      expect(playAttemptDocs[2].attemptContext).toBe(AttemptContext.UNSOLVED);
      expect(lvl.calc_playattempts_unique_users).toStrictEqual([new Types.ObjectId(TestId.USER)]);
      expect(lvl.calc_playattempts_just_beaten_count).toBe(1);
    }
  },
  {
    levelId: TestId.LEVEL_4,
    name: 'CarlAndre bug',
    list: [
      ['play', 0, 'created'],
      ['play', 30, 'updated'],
      ['win_20', 30, ''],
      ['play', 41, 'created'],
      ['play', 86, 'updated'],
      ['win_10', 89, ''],
      ['play', 103, 'created'],
      ['play', 120, 'updated'],
      ['win_8', 125, ''],
    ],
    tests: async (playAttemptDocs: PlayAttempt[], statDocs: Stat[], lvl: Level) => {
      expect(lvl.calc_playattempts_just_beaten_count).toBe(1);
      // 0-30, 41-89, 103-125
      expect(lvl.calc_playattempts_duration_sum).toBe(100);

      expect(playAttemptDocs.length).toBe(3);
      expect(playAttemptDocs[0].updateCount).toBe(2);
      expect(playAttemptDocs[0].attemptContext).toBe(AttemptContext.JUST_SOLVED);
      expect(playAttemptDocs[1].updateCount).toBe(2);
      expect(playAttemptDocs[1].attemptContext).toBe(AttemptContext.UNSOLVED);
      expect(playAttemptDocs[2].updateCount).toBe(2);
      expect(playAttemptDocs[2].attemptContext).toBe(AttemptContext.UNSOLVED);
      expect(lvl.calc_playattempts_unique_users).toStrictEqual([new Types.ObjectId(TestId.USER)]);
      expect(lvl.calc_playattempts_just_beaten_count).toBe(1);
    }
  },
  {
    levelId: TestId.LEVEL_4,
    name: 'screwtape bug',
    list: [
      ['play', 0, 'created'],
      ['play', 30, 'updated'],
      ['win_10', 30, ''],
      ['play', 41, 'created'],
      ['play', 86, 'updated'],
      ['win_10', 89, ''],
      ['play', 103, 'updated'],
      ['play', 120, 'updated'],
      ['win_8', 125, ''],
    ],
    tests: async (playAttemptDocs: PlayAttempt[], statDocs: Stat[], lvl: Level) => {
      expect(lvl.calc_playattempts_just_beaten_count).toBe(1);
      // 0-30, 41-125
      expect(lvl.calc_playattempts_duration_sum).toBe(114);

      expect(playAttemptDocs.length).toBe(2);
      expect(playAttemptDocs[0].updateCount).toBe(4);
      expect(playAttemptDocs[0].attemptContext).toBe(AttemptContext.JUST_SOLVED);
      expect(playAttemptDocs[1].updateCount).toBe(2);
      expect(playAttemptDocs[1].attemptContext).toBe(AttemptContext.UNSOLVED);
      expect(lvl.calc_playattempts_unique_users).toStrictEqual([new Types.ObjectId(TestId.USER)]);
      expect(lvl.calc_playattempts_just_beaten_count).toBe(1);
    }
  },
  {
    levelId: TestId.LEVEL_4,
    name: 'records with no breaks',
    list: [
      ['play', 0, 'created'],
      ['play', 15, 'updated'],
      ['play', 30, 'updated'],
      ['win_20', 30, ''],
      ['win_10', 40, ''],
      ['win_8', 50, ''],
    ],
    tests: async (playAttemptDocs: PlayAttempt[], statDocs: Stat[], lvl: Level) => {
      expect(lvl.calc_playattempts_just_beaten_count).toBe(1);
      expect(lvl.calc_playattempts_duration_sum).toBe(50);

      expect(playAttemptDocs.length).toBe(1);
      expect(playAttemptDocs[0].updateCount).toBe(5);
      expect(playAttemptDocs[0].attemptContext).toBe(AttemptContext.JUST_SOLVED);
      expect(lvl.calc_playattempts_unique_users).toStrictEqual([new Types.ObjectId(TestId.USER)]);
      expect(lvl.calc_playattempts_just_beaten_count).toBe(1);
    }
  },
] as PlayAttemptTest[];

describe('Testing stats api', () => {
  for (const t of tests) {
    for (const [action, timestamp, expected] of t.list) {
      // delete all playattempts
      test(t.name + ' action [' + action + '] at [t=' + timestamp + 's]', async () => {
        jest.spyOn(TimerUtil, 'getTs').mockReturnValue(timestamp as number);

        if (action === 'play') {
          await testApiHandler({
            handler: async (_, res) => {
              const req: NextApiRequestWithAuth = {
                method: 'POST',
                cookies: {
                  token: getTokenCookieValue(TestId.USER),
                },
                body: {
                  levelId: t.levelId
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

              expect(res.status).toBe(200);
              expect(response.message).toBe(expected);
            },
          });
        } else if (action === 'win_20') {
          await testApiHandler({
            handler: async (_, res) => {
              const req: NextApiRequestWithAuth = {
                method: 'PUT',
                cookies: {
                  token: getTokenCookieValue(TestId.USER),
                },
                body: {
                  levelId: t.levelId,
                  directions: [
                    Direction.RIGHT,
                    Direction.RIGHT,
                    Direction.RIGHT,
                    Direction.RIGHT,
                    Direction.DOWN,
                    Direction.DOWN,
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
                  ],
                },
                headers: {
                  'content-type': 'application/json',
                },
              } as unknown as NextApiRequestWithAuth;

              await statsHandler(req, res);
            },
            test: async ({ fetch }) => {
              const res = await fetch();
              const response = await res.json();

              expect(response.error).toBeUndefined();
            },
          });
        } else if (action === 'win_10') {
          await testApiHandler({
            handler: async (_, res) => {
              const req: NextApiRequestWithAuth = {
                method: 'PUT',
                cookies: {
                  token: getTokenCookieValue(TestId.USER),
                },
                body: {
                  levelId: t.levelId,
                  directions: [
                    Direction.RIGHT,
                    Direction.RIGHT,
                    Direction.RIGHT,
                    Direction.RIGHT,
                    Direction.DOWN,
                    Direction.DOWN,
                    Direction.DOWN,
                    Direction.UP,
                    Direction.DOWN,
                    Direction.DOWN,
                  ],
                },
                headers: {
                  'content-type': 'application/json',
                },
              } as unknown as NextApiRequestWithAuth;

              await statsHandler(req, res);
            },
            test: async ({ fetch }) => {
              const res = await fetch();
              const response = await res.json();

              expect(response.error).toBeUndefined();
            },
          });
        } else if (action === 'win_8' || action === 'b_win_8') {
          const usrId = action === 'win_8' ? TestId.USER : TestId.USER_B;

          await testApiHandler({
            handler: async (_, res) => {
              const req: NextApiRequestWithAuth = {
                method: 'PUT',
                cookies: {
                  token: getTokenCookieValue(usrId),
                },
                body: {
                  levelId: t.levelId,
                  directions: [
                    Direction.RIGHT,
                    Direction.RIGHT,
                    Direction.RIGHT,
                    Direction.RIGHT,
                    Direction.DOWN,
                    Direction.DOWN,
                    Direction.DOWN,
                    Direction.DOWN,
                  ],
                },
                headers: {
                  'content-type': 'application/json',
                },
              } as unknown as NextApiRequestWithAuth;

              await statsHandler(req, res);
            },
            test: async ({ fetch }) => {
              const res = await fetch();
              const response = await res.json();

              expect(response.error).toBeUndefined();
            },
          });
        }
      });
    }

    test(t.name + ' clear', async () => {
      // NB: need to process here as there may be remaining queue messages (eg api/stats queueRefreshIndexCalcs)
      await processQueueMessages();

      const allAttempts = await PlayAttemptModel.find({ levelId: t.levelId }, {}, { sort: { _id: -1 } });
      const allStats = await StatModel.find({ levelId: t.levelId }, {}, { sort: { ts: 1 } });
      // NB: LEVEL and LEVEL_4 both have leastMoves of 20 so this works
      const lvlBeforeResync = await LevelModel.findByIdAndUpdate(t.levelId, { $set: { leastMoves: 20 } }, { new: true });

      await t.tests(allAttempts, allStats, lvlBeforeResync);

      const resetArr = { $set: {
        calc_difficulty_estimate: -1,
        calc_playattempts_duration_sum: 0,
        calc_playattempts_just_beaten_count: 0,
        calc_playattempts_unique_users: [],
        calc_stats_players_beaten: 0,
      } };
      const resetLvl = await LevelModel.findOneAndUpdate({ _id: t.levelId }, resetArr, { new: true });

      expect(resetLvl).toBeDefined();
      expect(resetLvl.calc_playattempts_just_beaten_count).toBe(0);
      expect(resetLvl.calc_playattempts_duration_sum).toBe(0);
      expect(resetLvl.calc_playattempts_unique_users.length).toBe(0);
      expect(resetLvl.calc_stats_players_beaten).toBe(0);
      expect(resetLvl.calc_difficulty_estimate).toBe(-1);

      // verify queue functions update level calc fields correctly
      await queueCalcPlayAttempts(lvlBeforeResync._id);
      await queueRefreshIndexCalcs(lvlBeforeResync._id);
      await processQueueMessages();
      const lvlAfterResync = await LevelModel.findById(t.levelId);

      expect(lvlAfterResync.calc_playattempts_just_beaten_count).toBe(lvlBeforeResync.calc_playattempts_just_beaten_count);
      expect(lvlAfterResync.calc_playattempts_duration_sum).toBe(lvlBeforeResync.calc_playattempts_duration_sum);
      expect(lvlAfterResync.calc_difficulty_estimate).toBe(lvlBeforeResync.calc_difficulty_estimate);
      expect(lvlAfterResync.calc_stats_players_beaten.length).toBe(lvlBeforeResync.calc_stats_players_beaten.length);
      expect(lvlAfterResync.calc_playattempts_unique_users.sort()).toStrictEqual(lvlBeforeResync.calc_playattempts_unique_users.sort());

      // cleanup
      await PlayAttemptModel.deleteMany({ levelId: t.levelId });
      await StatModel.deleteMany({ levelId: t.levelId });
      await RecordModel.deleteMany({ levelId: t.levelId });
      const resetLvl2 = await LevelModel.findOneAndUpdate({ _id: t.levelId }, resetArr, { new: true });

      expect(resetLvl2).toBeDefined();
      expect(resetLvl2.calc_playattempts_just_beaten_count).toBe(0);
      expect(resetLvl2.calc_playattempts_duration_sum).toBe(0);
      expect(resetLvl2.calc_playattempts_unique_users.length).toBe(0);
      expect(resetLvl2.calc_stats_players_beaten).toBe(0);
      expect(resetLvl2.calc_difficulty_estimate).toBe(-1);
    });
  }

  test('Wrong HTTP method should fail', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PATCH',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {

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

        expect(response.error).toBe('Method not allowed');
        expect(res.status).toBe(405);
      },
    });
  });
  test('Doing a POST with no body should error', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
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

        expect(response.error).toBe('Bad request');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Doing a POST with a body but no params should error', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {

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

        expect(response.error).toBe('Invalid body.levelId');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Doing a POST with an invalid level should error', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    const levelId = new Types.ObjectId();

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            levelId: levelId,
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

        expect(response.error).toBe(`Level ${levelId} not found`);
        expect(res.status).toBe(404);
      },
    });
  });
  test('calcDifficultyEstimate', async () => {
    const level = await initLevel(TestId.USER, 'calcDifficultyEstimate', {}, false);

    for (let i = 0; i < 9; i++) {
      await PlayAttemptModel.create({
        _id: new Types.ObjectId(),
        // half solved
        attemptContext: i % 2 === 0 ? AttemptContext.JUST_SOLVED : AttemptContext.UNSOLVED,
        endTime: i + 10,
        levelId: level._id,
        startTime: 0,
        updateCount: 0,
        userId: new Types.ObjectId(),
      });
    }

    await queueCalcPlayAttempts(level._id);
    await processQueueMessages();

    const levelUpdated = await LevelModel.findById(level._id);

    expect(levelUpdated).toBeDefined();
    expect(levelUpdated?.calc_difficulty_estimate).toBe(-1);
    expect(levelUpdated?.calc_playattempts_duration_sum).toBe(126);
    expect(levelUpdated?.calc_playattempts_just_beaten_count).toBe(5);
    expect(levelUpdated?.calc_playattempts_unique_users?.length).toBe(9);

    const unsolvedUserId = new Types.ObjectId();

    // create a playattempt for the 10th unique user
    await PlayAttemptModel.create({
      _id: new Types.ObjectId(),
      attemptContext: AttemptContext.UNSOLVED,
      endTime: 20,
      levelId: level._id,
      startTime: 0,
      updateCount: 0,
      userId: unsolvedUserId,
    });
    await UserModel.create({
      _id: unsolvedUserId,
      calc_records: 0,
      email: 'unsolved@gmail.com',
      last_visited_at: 0,
      name: 'unsolved',
      password: 'unsolved',
      score: 0,
      ts: 0,
    });

    await queueCalcPlayAttempts(level._id);
    await processQueueMessages();

    const levelUpdated2 = await LevelModel.findById(level._id);

    expect(levelUpdated2).toBeDefined();
    expect(levelUpdated2?.calc_difficulty_estimate).toBeCloseTo(29.2 * 1.47629);
    expect(levelUpdated2?.calc_playattempts_duration_sum).toBe(146);
    expect(levelUpdated2?.calc_playattempts_just_beaten_count).toBe(5);
    expect(levelUpdated2?.calc_playattempts_unique_users?.length).toBe(10);

    jest.spyOn(TimerUtil, 'getTs').mockReturnValue(30);
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(unsolvedUserId.toString()),
          },
          body: {
            levelId: level._id
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

        expect(response.message).toBe('updated');
        expect(res.status).toBe(200);
      },
    });

    const levelUpdated3 = await LevelModel.findById<Level>(level._id);

    expect(levelUpdated3).toBeDefined();
    expect(levelUpdated3?.calc_difficulty_estimate).toBeCloseTo(31.2 * 1.47629);
    expect(levelUpdated3?.calc_playattempts_duration_sum).toBe(156);
    expect(levelUpdated3?.calc_playattempts_just_beaten_count).toBe(5);
    expect(levelUpdated3?.calc_playattempts_unique_users?.length).toBe(10);

    jest.spyOn(TimerUtil, 'getTs').mockReturnValue(40);
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(unsolvedUserId.toString()),
          },
          body: {
            levelId: level._id,
            directions: [
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
            ],
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await statsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(200);
      },
    });

    const levelUpdated4 = await LevelModel.findById<Level>(level._id);

    expect(levelUpdated4).toBeDefined();
    expect(levelUpdated4?.calc_difficulty_estimate).toBeCloseTo(166 / 6 * 1.47134);
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

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            levelId: TestId.LEVEL_4,
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

        expect(response.message).toBe('created');
        expect(res.status).toBe(200);
      },
    });
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            levelId: TestId.LEVEL_4,
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

        expect(response.message).toBe('updated');
        expect(res.status).toBe(200);
      },
    });

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
  test('POST with transaction error', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(PlayAttemptModel, 'findOne').mockImplementationOnce(() => {
      throw new Error('Test error');
    });
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            levelId: TestId.LEVEL_4,
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

        expect(response.error).toBe('Error in POST play-attempt');
        expect(res.status).toBe(500);
      },
    });
  });
  test('playAttempts should not sort by _id', async () => {
    const playAttemptId1 = new Types.ObjectId();
    const playAttempt1 = {
      _id: playAttemptId1,
      attemptContext: AttemptContext.UNSOLVED,
      endTime: 10,
      levelId: new Types.ObjectId(TestId.LEVEL),
      startTime: 1,
      userId: new Types.ObjectId(TestId.USER),
    } as PlayAttempt;

    const playAttemptId2 = new Types.ObjectId();
    const playAttempt2 = {
      _id: playAttemptId2,
      attemptContext: AttemptContext.UNSOLVED,
      endTime: 30,
      levelId: new Types.ObjectId(TestId.LEVEL),
      startTime: 21,
      userId: new Types.ObjectId(TestId.USER),
    } as PlayAttempt;

    const playAttemptId3 = new Types.ObjectId();
    const playAttempt3 = {
      _id: playAttemptId3,
      attemptContext: AttemptContext.UNSOLVED,
      endTime: 20,
      levelId: new Types.ObjectId(TestId.LEVEL),
      startTime: 11,
      userId: new Types.ObjectId(TestId.USER),
    } as PlayAttempt;

    await PlayAttemptModel.create([playAttempt1, playAttempt2, playAttempt3]);

    jest.spyOn(TimerUtil, 'getTs').mockReturnValue(40);

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            levelId: TestId.LEVEL,
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

        expect(res.status).toBe(200);
        expect(response.message).toBe('updated');
        expect(response.playAttempt).toBe(playAttemptId2.toString());
      },
    });
  });
});
