/* eslint-disable @typescript-eslint/no-explicit-any */
import { ObjectId } from 'bson';
import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../constants/testId';
import TimeRange from '../../../constants/timeRange';
import { FilterSelectOption } from '../../../helpers/filterSelectOptions';
import getTs from '../../../helpers/getTs';
import dbConnect, { dbDisconnect } from '../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../lib/getTokenCookie';
import { initLevel } from '../../../lib/initializeLocalDb';
import { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { LevelModel, StatModel } from '../../../models/mongoose';
import handler from '../../../pages/api/search';

afterEach(() => {
  jest.restoreAllMocks();
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

    const lvl = await initLevel(usr,
      animalNames[(i * i + 171) % animalNames.length] + ' ' + animalNames[i % animalNames.length],
      {
        leastMoves: (100 + i),
        ts: getTs() - offset
      });

    // create a completion record for every third level
    if (i % 3 === 0) {
      await StatModel.create({
        _id: new ObjectId(),
        userId: TestId.USER,
        levelId: lvl._id.toString(),
        complete: true,
        attempts: 1,
        moves: lvl.leastMoves,
        ts: getTs()
      });
    } else if (i % 5 === 0 ) {
      await StatModel.create({
        _id: new ObjectId(),
        userId: TestId.USER,
        levelId: lvl._id.toString(),
        complete: false,
        attempts: 1,
        moves: lvl.leastMoves + 2,
        ts: getTs()
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
    test: async (response: any) => {
      expect(response.totalRows).toBe(26);
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

const sortBy_Fields = [
  [ 'least_moves', 'leastMoves' ],
  [ 'ts', 'ts' ],
  [ 'reviews_score', 'calc_reviews_score_laplace'],
  ['total_reviews', 'calc_reviews_count'],
  ['players_beaten', 'calc_stats_players_beaten']
];

for (let i = 0; i < sortBy_Fields.length; i++) {
  const field = sortBy_Fields[i];

  for (let page = 1; page < 4; page++) {
    testRuns.push({
      query: '?sort_by=' + field[0] + '&page=' + page,
      test: async (response: any) => {
        expect(response.totalRows).toBe(26);
        expect(response.levels.length).toBe([20, 6, 0][page - 1]);

        for (let i = 1; i < response.levels.length; i++) {
          expect(response.levels[i][field[1]]).toBeLessThanOrEqual(response.levels[i - 1][field[1]]);
        }
      }
    });
    testRuns.push({
      query: '?sort_by=' + field[0] + '&sort_dir=asc&page=' + page,
      test: async (response: any) => {
        expect(response.totalRows).toBe(26);

        expect(response.levels.length).toBe([20, 6, 0][page - 1]);

        for (let i = 1; i < response.levels.length; i++) {
          expect(response.levels[i][field[1]]).toBeGreaterThanOrEqual(response.levels[i - 1][field[1]]);
        }
      }
    });
  }
}

testRuns = testRuns.concat([
  {
    query: `?show_filter=${FilterSelectOption.HideWon}`,
    test: async (response: any) => {
      expect(response.totalRows).toBe(17);
      expect(response.levels.length).toBe(17);
    }
  },
  {
    query: `?show_filter=${FilterSelectOption.ShowInProgress}`,
    test: async (response: any) => {
      expect(response.totalRows).toBe(3);
      expect(response.levels.length).toBe(3);
    }
  },
  {
    query: `?time_range=${TimeRange[TimeRange.Day]}`,
    test: async (response: any) => {
      expect(response.totalRows).toBe(7);
      expect(response.levels.length).toBe(7);
    }
  },
  {
    query: `?time_range=${TimeRange[TimeRange.Week]}`,
    test: async (response: any) => {
      expect(response.totalRows).toBe(11);
      expect(response.levels.length).toBe(11);
    }
  },
  {
    query: `?time_range=${TimeRange[TimeRange.Month]}`,
    test: async (response: any) => {
      expect(response.totalRows).toBe(16);
      expect(response.levels.length).toBe(16);
    }
  },
  {
    query: `?time_range=${TimeRange[TimeRange.Year]}`,
    test: async (response: any) => {
      expect(response.totalRows).toBe(21);
      expect(response.levels.length).toBe(20);
    }
  },
  // min max steps
  {
    query: '?min_steps=0&max_steps=110',
    test: async (response: any) => {
      expect(response.totalRows).toBe(12);
      expect(response.levels.length).toBe(12);

      for (let i = 0; i < response.levels.length; i++) {
        expect(response.levels[i].leastMoves).toBeGreaterThanOrEqual(0);
        expect(response.levels[i].leastMoves).toBeLessThanOrEqual(110);
      }
    }
  },
  {
    query: '?searchAuthor=test',
    test: async (response: any) => {
      expect(response.totalRows).toBe(13);
      expect(response.levels.length).toBe(13);

      for (let i = 0; i < response.levels.length; i++) {
        expect(response.levels[i].userId._id).toBe(TestId.USER);
      }
    }
  },
]);

describe('Testing search endpoint for various inputs', () => {
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
              token: getTokenCookieValue(TestId.USER),
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
  it('should handle a db error okay', async () => {
    jest.spyOn(LevelModel, 'find').mockReturnValueOnce({ 'thisobjectshouldthrowerror': true } as any);
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
