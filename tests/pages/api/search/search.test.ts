/* eslint-disable @typescript-eslint/no-explicit-any */
import Role from '@root/constants/role';
import StatFilter from '@root/constants/statFilter';
import TileType from '@root/constants/tileType';
import { enableFetchMocks } from 'jest-fetch-mock';
import mongoose, { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import TestId from '../../../../constants/testId';
import TimeRange from '../../../../constants/timeRange';
import { TimerUtil } from '../../../../helpers/getTs';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { initLevel } from '../../../../lib/initializeLocalDb';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { LevelModel, StatModel, UserModel } from '../../../../models/mongoose';
import handler from '../../../../pages/api/search';
import { BlockFilterMask } from '../../../../pages/search';

afterEach(() => {
  jest.restoreAllMocks();
});
beforeAll(async () => {
  await dbConnect();
  await UserModel.updateOne({ _id: TestId.USER }, { $push: { roles: Role.PRO } });
});
enableFetchMocks();

beforeAll(async () => {
  await dbConnect();
  const animalNames = ['cat', 'dog', 'bird', 'fish', 'lizard', 'snake', 'turtle', 'horse', 'sheep', 'cow', 'pig', 'monkey', 'deer'];

  for (let i = 0; i < 25; i++) {
    const usr = i % 2 === 0 ? TestId.USER_B : TestId.USER;
    let offset = 0;

    if (i > 5 && i < 10) {
      // get the offset for 36 hours ago
      offset = 60 * 60 * 36; // 36 hours ago
    } else if (i >= 10 && i < 15) {
      offset = 60 * 60 * 24 * 7 * 2; // 2 weeks ago
    } else if (i >= 15 && i < 20) {
      offset = 60 * 60 * 24 * 45; // 45 days ago
    } else if (i >= 20) {
      offset = 60 * 60 * 24 * 400; // 400 days ago
    }

    // use repeat method
    const lvl = await initLevel(usr,
      animalNames[(i * i + 171) % animalNames.length] + ' ' + animalNames[i % animalNames.length],
      {
        leastMoves: (100 + i),
        ts: TimerUtil.getTs() - offset,
        calc_playattempts_unique_users: Array.from({ length: 11 }, () => {return new Types.ObjectId() as mongoose.Types.ObjectId;}),
        calc_playattempts_duration_sum: 1000,
        calc_playattempts_just_beaten_count: i,
        calc_difficulty_estimate: 1000 / i,
      }
    );

    // create a completion record for every third level
    if (i % 3 === 0) {
      await StatModel.create({
        _id: new Types.ObjectId(),
        userId: TestId.USER,
        levelId: lvl._id.toString(),
        complete: true,
        attempts: 1,
        moves: lvl.leastMoves,
        ts: TimerUtil.getTs()
      });
    } else if (i % 5 === 0 ) {
      await StatModel.create({
        _id: new Types.ObjectId(),
        userId: TestId.USER,
        levelId: lvl._id.toString(),
        complete: false,
        attempts: 1,
        moves: lvl.leastMoves + 2,
        ts: TimerUtil.getTs()
      });
    }
  }
}, 20000);

afterAll(async() => {
  await dbDisconnect();
});

let testRuns = [
  {
    query: '',
    noauth: false,
    test: async (response: any) => {
      expect(response.totalRows).toBe(28);
      expect(response.levels.length).toBe(20);
    }
  },
  {
    query: '?search=cat',
    test: async (response: any) => {
      expect(response.totalRows).toBe(2);
      expect(response.levels.length).toBe(2);
    }
  }
];

const sortProperties = [
  {
    sortBy: 'leastMoves',
    property: 'leastMoves',
    isInverted: false,
  },
  {
    sortBy: 'ts',
    property: 'ts',
    isInverted: false,
  },
  {
    sortBy: 'reviewScore',
    property: 'calc_reviews_score_laplace',
    isInverted: false,
  },
  {
    sortBy: 'total_reviews',
    property: 'calc_reviews_count',
    isInverted: false,
  },
  {
    sortBy: 'solves',
    property: 'calc_stats_players_beaten',
    isInverted: false,
  },
];

for (let i = 0; i < sortProperties.length; i++) {
  const sortObj = sortProperties[i];

  for (let page = 1; page < 4; page++) {
    testRuns.push({
      query: '?sortBy=' + sortObj.sortBy + '&page=' + page,
      test: async (response: any) => {
        expect(response.totalRows).toBe(28);
        expect(response.levels.length).toBe([20, 8, 0][page - 1]);

        for (let i = 1; i < response.levels.length; i++) {
          if (sortObj.isInverted) {
            expect(response.levels[i][sortObj.property]).toBeGreaterThanOrEqual(response.levels[i - 1][sortObj.property]);
          } else {
            expect(response.levels[i][sortObj.property]).toBeLessThanOrEqual(response.levels[i - 1][sortObj.property]);
          }
        }
      }
    });
    testRuns.push({
      query: '?sortBy=' + sortObj.sortBy + '&sortDir=asc&page=' + page,
      test: async (response: any) => {
        expect(response.totalRows).toBe(28);
        expect(response.levels.length).toBe([20, 8, 0][page - 1]);

        for (let i = 1; i < response.levels.length; i++) {
          if (sortObj.isInverted) {
            expect(response.levels[i][sortObj.property]).toBeLessThanOrEqual(response.levels[i - 1][sortObj.property]);
          } else {
            expect(response.levels[i][sortObj.property]).toBeGreaterThanOrEqual(response.levels[i - 1][sortObj.property]);
          }
        }
      }
    });
  }
}

testRuns = testRuns.concat([
  {
    query: `?statFilter=${StatFilter.HideSolved}`,
    test: async (response: any) => {
      expect(response.totalRows).toBe(17);
      expect(response.levels.length).toBe(17);
    }
  },
  {
    query: '?sortBy=calcDifficultyEstimate&sortDir=asc',
    test: async (response: any) => {
      expect(response.totalRows).toBe(25);
      expect(response.levels.length).toBe(20);

      for (let i = 1; i < response.levels.length; i++) {
        expect(response.levels[i].calc_difficulty_estimate).toBeGreaterThanOrEqual(response.levels[i - 1].calc_difficulty_estimate);
      }
    }
  },
  {
    query: '?searchAuthorId=' + TestId.USER + '&sortBy=calcDifficultyEstimate&sortDir=asc',
    test: async (response: any) => {
      expect(response.totalRows).toBe(12);
      expect(response.levels.length).toBe(12);

      for (let i = 1; i < response.levels.length; i++) {
        expect(response.levels[i].calc_difficulty_estimate).toBeGreaterThanOrEqual(response.levels[i - 1].calc_difficulty_estimate);
        expect(response.levels[i].userId._id.toString()).toBe(TestId.USER);
      }
    }
  },
  {
    query: '?searchAuthorId=' + TestId.USER + '&sortBy=name&sortDir=asc',
    test: async (response: any) => {
      expect(response.totalRows).toBe(14);
      expect(response.levels.length).toBe(14);

      expect(response.levels[0].name).toBe('bird cat');
      expect(response.levels[1].name).toBe('deer horse');
      expect(response.levels[2].name).toBe('deer turtle');
    }
  },
  {
    query: `?statFilter=${StatFilter.InProgress}`,
    test: async (response: any) => {
      expect(response.totalRows).toBe(3);
      expect(response.levels.length).toBe(3);
    }
  },
  {
    query: `?timeRange=${TimeRange[TimeRange.Day]}`,
    test: async (response: any) => {
      expect(response.totalRows).toBe(9);
      expect(response.levels.length).toBe(9);
    }
  },
  {
    query: `?timeRange=${TimeRange[TimeRange.Week]}`,
    test: async (response: any) => {
      expect(response.totalRows).toBe(13);
      expect(response.levels.length).toBe(13);
    }
  },
  {
    query: `?timeRange=${TimeRange[TimeRange.Month]}`,
    test: async (response: any) => {
      expect(response.totalRows).toBe(18);
      expect(response.levels.length).toBe(18);
    }
  },
  {
    query: `?timeRange=${TimeRange[TimeRange.Year]}`,
    test: async (response: any) => {
      expect(response.totalRows).toBe(23);
      expect(response.levels.length).toBe(20);
    }
  },
  // min max steps
  {
    query: '?minSteps=1&maxSteps=110',
    test: async (response: any) => {
      expect(response.totalRows).toBe(14);
      expect(response.levels.length).toBe(14);

      for (let i = 0; i < response.levels.length; i++) {
        expect(response.levels[i].leastMoves).toBeGreaterThanOrEqual(1);
        expect(response.levels[i].leastMoves).toBeLessThanOrEqual(110);
      }
    }
  },
  {
    query: '?searchAuthor=test',
    test: async (response: any) => {
      expect(response.totalRows).toBe(14);
      expect(response.levels.length).toBe(14);

      for (let i = 0; i < response.levels.length; i++) {
        expect(response.levels[i].userId._id).toBe(TestId.USER);
      }
    }
  },
  {
    query: '?difficultyFilter=Pending',
    test: async (response: any) => {
      expect(response.totalRows).toBe(3);
      expect(response.levels.length).toBe(3);

      for (let i = 0; i < response.levels.length; i++) {
        expect(response.levels[i].calc_difficulty_estimate).toBe(-1);
      }
    }
  },
  {
    query: '?difficultyFilter=Kindergarten',
    test: async (response: any) => {
      expect(response.totalRows).toBe(2);
      expect(response.levels.length).toBe(2);

      for (let i = 0; i < response.levels.length; i++) {
        expect(response.levels[i].calc_difficulty_estimate).toBeLessThan(45);
      }
    }
  },
  {
    query: '?difficultyFilter=Junior%20High',
    noauth: true,
    test: async (response: any) => {
      expect(response.totalRows).toBe(5);
      expect(response.levels.length).toBe(5);

      for (let i = 0; i < response.levels.length; i++) {
        expect(response.levels[i].calc_difficulty_estimate).toBeGreaterThan(120);
        expect(response.levels[i].calc_difficulty_estimate).toBeLessThan(300);
      }
    }
  },

  {
    query: '?blockFilter=' + BlockFilterMask.HOLE,
    test: async (response: any) => {
      expect(response.totalRows).toBe(1);
      expect(response.levels.length).toBe(1);
      const levelWeFound = await LevelModel.findById(response.levels[0]._id);

      expect(levelWeFound.data).not.toContain(TileType.Hole);
    }
  },
  {
    query: '?blockFilter=' + BlockFilterMask.BLOCK,
    test: async (response: any) => {
      expect(response.totalRows).toBe(1);
      expect(response.levels.length).toBe(1);
      const levelWeFound = await LevelModel.findById(response.levels[0]._id);

      expect(levelWeFound.data).not.toContain(TileType.Block);
    }
  },
  {
    query: '?blockFilter=' + BlockFilterMask.RESTRICTED,
    test: async (response: any) => {
      expect(response.totalRows).toBe(1);
      expect(response.levels.length).toBe(1);
      const levelWeFound = await LevelModel.findById(response.levels[0]._id);

      expect(levelWeFound.data).not.toContain(TileType.LeftRight);
    }
  },
]);

describe('Testing search endpoint for various inputs', () => {
  jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
  test('Calling with wrong http method should fail', async () => {
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

        expect(response.error).toBe('Method not allowed');
        expect(res.status).toBe(405);
      },
    });
  });
  testRuns.forEach((testRun) => {
    it(`should return a 200 status code for ${testRun.query}`, async () => {
      await testApiHandler({
        handler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'GET',
            cookies: {
              token: testRun.noauth ? null : getTokenCookieValue(TestId.USER),
            },
            query: Object.fromEntries(new URLSearchParams(testRun.query)),
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await handler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.error).toBeUndefined();
          expect(res.status).toBe(200);
          await testRun.test(response);
        },
      });
    });
  });
  it('should handle a non Pro user filtering by a Pro query', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          query: {
            blockFilter: String(BlockFilterMask.HOLE),
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

        expect(response.totalRows).toBe(28);
        expect(res.status).toBe(200);
      },
    });
  });
  it('should handle a Pro user filtering by a Pro query', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            blockFilter: String(BlockFilterMask.HOLE),
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

        expect(response.totalRows).toBe(1);
        expect(res.status).toBe(200);
      },
    });
  });
  it('should handle a db error okay', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(LevelModel, 'aggregate').mockImplementation(() => {
      throw new Error('Test DB error');
    });

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {},
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Error querying Levels');
        expect(res.status).toBe(500);
      },
    });
  });
});
