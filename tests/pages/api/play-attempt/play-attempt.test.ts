import { LevelModel, PlayAttemptModel, RecordModel, StatModel } from '../../../../models/mongoose';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { ObjectId } from 'bson';
import { calcPlayAttempts } from '../../../../models/schemas/levelSchema';
import { dbDisconnect } from '../../../../lib/dbConnect';
import { enableFetchMocks } from 'jest-fetch-mock';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import handler from '../../../../pages/api/play-attempt/index';
import statsHandler from '../../../../pages/api/stats/index';
import { testApiHandler } from 'next-test-api-route-handler';
import getTs from '../../../../helpers/getTs';
import PlayAttempt from '../../../../models/db/playAttempt';
import Stat from '../../../../models/db/stat';
import Level from '../../../../models/db/level';

const USER_ID_FOR_TESTING = '600000000000000000000000';
const differentUser = '600000000000000000000006';
const LEVEL_ID_FOR_TESTING = '600000000000000000000002';

afterAll(async () => {
  await dbDisconnect();
});

enableFetchMocks();
const MINUTE = 60;

const tests = [
  {
    name: 'play at 5 min for 4 min',
    list: [
      ['play', 5, 'created'],
      ['play', 6, 'updated'],
      ['play', 7, 'updated'],
      ['play', 9, 'updated'],
      ['clear', 0, '']
    ],
    tests: async (playAttemptDocs:PlayAttempt[], statDocs:Stat[], lvl:Level) => {
      expect(lvl.calc_playattempts_duration_sum).toBe(4 * MINUTE);
      expect(playAttemptDocs.length).toBe(1);
      expect(playAttemptDocs.length).toBe(lvl.calc_playattempts_count);
      expect(playAttemptDocs[0].attemptContext).toBe(0);
    }
  },
  {
    name: 'play regular',
    list: [
      ['play', 0, 'created'],
      ['play', 10, 'updated'],
      ['play', 26, 'created'],
      ['clear', 0, '']
    ],
    tests: async (playAttemptDocs:PlayAttempt[], statDocs:Stat[], lvl:Level) => {
      expect(lvl.calc_playattempts_duration_sum).toBe(10 * MINUTE);
      expect(playAttemptDocs.length).toBe(2);
      expect(playAttemptDocs.length).toBe(lvl.calc_playattempts_count);
      expect(playAttemptDocs[0].attemptContext).toBe(0);
      expect(playAttemptDocs[1].attemptContext).toBe(0);
    }
  },
  {
    name: 'play at 14m for 5m, come back 5m later and then play for 6m',
    list: [
      ['play', 14, 'created'],
      ['play', 19, 'updated'],
      ['play', 25, 'updated'],
      ['clear', 0, '']
    ],
    tests: async (playAttemptDocs:PlayAttempt[], statDocs:Stat[], lvl:Level) => {
      expect(playAttemptDocs.length).toBe(1);
      expect(playAttemptDocs[0].attemptContext).toBe(0);
      expect(lvl.calc_playattempts_duration_sum).toBe(11 * MINUTE);
    }
  },
  {
    name: 'win right away then play 25 minutes later but do not play',
    list: [
      ['play', 0, 'created'],
      ['play', 1, 'updated'],
      ['win', 1, ''],
      ['play', 25, 'created'],
      ['clear', 0, '']
    ],
    tests: async (playAttemptDocs:PlayAttempt[], statDocs:Stat[], lvl:Level) => {
      expect(lvl.calc_playattempts_duration_sum).toBe(1 * MINUTE );
      expect(playAttemptDocs.length).toBe(2);
      expect(playAttemptDocs[0].attemptContext).toBe(2);
      expect(playAttemptDocs[1].attemptContext).toBe(1);
    }
  },
  {
    name: 'win right away then continue to play',
    list: [
      ['play', 0, 'created'],
      ['i_make_record', 1, 'ok'],
      ['play', 2, 'updated'],
      ['play', 3, 'updated'],
      ['clear', 0, '']
    ],
    tests: async (playAttemptDocs:PlayAttempt[], statDocs:Stat[], lvl:Level) => {
      expect(lvl.calc_playattempts_duration_sum).toBe(3 * MINUTE);
      expect(playAttemptDocs.length).toBe(1);
      expect(playAttemptDocs[0].attemptContext).toBe(1);
    }
  },
  {
    name: 'win right away but then a record comes in way later',
    list: [
      ['play', 0, 'created'],
      ['win', 0.1, 'ok'],
      ['other_makes_record', 100, ''],
      ['clear', 0, '']
    ],
    tests: async (playAttemptDocs:PlayAttempt[], statDocs:Stat[], lvl:Level,) => {
      expect(playAttemptDocs.length).toBe(1);
      expect(playAttemptDocs[0].attemptContext).toBe(0);
    }
  },
  {
    name: 'win right away but then a record comes in way later then you match the record',
    list: [
      ['play', 0, 'created'],
      ['win', 0.1, 'ok'],
      ['other_makes_record', 1, ''],
      ['play', 2, 'updated'],
      ['i_make_record', 3, ''],
      ['clear', 0, '']
    ],
    tests: async (playAttemptDocs:PlayAttempt[], statDocs:Stat[], lvl:Level) => {
      expect(playAttemptDocs.length).toBe(1);
      expect(playAttemptDocs[0].attemptContext).toBe(1);
    }
  },
  {
    name: 'win right away, a record comes in way later, come back and play for a while, give up, then come back and play again and win, then come back a way later and then play',
    list: [
      ['play', 0, 'created'],
      ['win', 0.1, 'ok'],
      ['other_makes_record', 100, ''],
      ['play', 150, 'created'],
      ['play', 151, 'updated'],
      ['play', 156, 'updated'],
      ['play', 300, 'created'],
      ['play', 302, 'updated'],
      ['i_make_record', 302.5, ''],
      ['play', 345, 'created'],
      ['clear', 0, '']
    ],
    tests: async (playAttemptDocs:PlayAttempt[], statDocs:Stat[], lvl:Level) => {
      expect(playAttemptDocs.length).toBe(4);
      expect(playAttemptDocs[0].attemptContext).toBe(2);
      expect(playAttemptDocs[1].attemptContext).toBe(1);
      expect(playAttemptDocs[2].attemptContext).toBe(0);
      expect(playAttemptDocs[3].attemptContext).toBe(0);
    }
  }
];

describe('Testing stats api', () => {

  for (const t of tests) {
    for (const [action, timestamp, expected] of t.list) {
      // delete all playattempts
      test(t.name + ' action [' + action + '] at [t=' + timestamp + 'm]', async () => {
        if (action === 'clear') {
          const allAttempts = await PlayAttemptModel.find({}, {}, { sort: { _id: -1 } });
          const allStats = await StatModel.find({}, {}, { sort: { ts: 1 } });
          const lvlBeforeResync = await LevelModel.findById(LEVEL_ID_FOR_TESTING);

          await t.tests(allAttempts, allStats, lvlBeforeResync);

          const resetLvl = await LevelModel.findOneAndUpdate({ _id: LEVEL_ID_FOR_TESTING }, { $set: { calc_playattempts_count: 0, calc_playattempts_duration_sum: 0 } }, { new: true });

          expect(resetLvl).toBeDefined();
          expect(resetLvl.calc_playattempts_count).toBe(0);
          expect(resetLvl.calc_playattempts_duration_sum).toBe(0);
          await calcPlayAttempts(lvlBeforeResync);
          const lvlAfterResync = await LevelModel.findById(LEVEL_ID_FOR_TESTING);

          expect(lvlAfterResync.calc_playattempts_count).toBe(lvlBeforeResync.calc_playattempts_count);
          expect(lvlAfterResync.calc_playattempts_duration_sum).toBe(lvlBeforeResync.calc_playattempts_duration_sum);
          // Cleanup
          await PlayAttemptModel.deleteMany({});
          await StatModel.deleteMany({});
          await RecordModel.deleteMany({});
          await LevelModel.findOneAndUpdate({ _id: LEVEL_ID_FOR_TESTING }, { $set: { calc_playattempts_count: 0, calc_playattempts_duration_sum: 0 } }, { new: true });

          expect(resetLvl).toBeDefined();
          expect(resetLvl.calc_playattempts_count).toBe(0);
          expect(resetLvl.calc_playattempts_duration_sum).toBe(0);

          return;
        }

        const actual = jest.requireActual('../../../../helpers/getTs');

        jest.spyOn(actual, 'default').mockReturnValue(timestamp as number * MINUTE);

        if (action === 'play') {
          await testApiHandler({
            handler: async (_, res) => {
              const req: NextApiRequestWithAuth = {
                method: 'POST',
                cookies: {
                  token: getTokenCookieValue(USER_ID_FOR_TESTING),
                },
                body: {
                  levelId: LEVEL_ID_FOR_TESTING
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
        } else if (action === 'win') {
          await testApiHandler({
            handler: async (_, res) => {
              const req: NextApiRequestWithAuth = {
                method: 'PUT',
                cookies: {
                  token: getTokenCookieValue(USER_ID_FOR_TESTING),
                },
                body: {
                  levelId: LEVEL_ID_FOR_TESTING,
                  codes: [
                    'ArrowRight',
                    'ArrowRight',
                    'ArrowRight',
                    'ArrowRight',
                    'ArrowDown',
                    'ArrowDown',
                    'ArrowDown',
                    'ArrowUp',
                    'ArrowDown',
                    'ArrowDown',
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
        } else if (action === 'i_make_record' || action === 'other_makes_record') {
          const usrId = action === 'i_make_record' ? USER_ID_FOR_TESTING : differentUser;

          await testApiHandler({
            handler: async (_, res) => {
              const req: NextApiRequestWithAuth = {
                method: 'PUT',
                cookies: {
                  token: getTokenCookieValue(usrId),
                },
                body: {
                  levelId: LEVEL_ID_FOR_TESTING,
                  codes: [
                    'ArrowRight',
                    'ArrowRight',
                    'ArrowRight',
                    'ArrowRight',
                    'ArrowDown',
                    'ArrowDown',
                    'ArrowDown',
                    'ArrowDown',
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

  }

  test('Wrong HTTP method should fail', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PATCH',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
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
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
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

        expect(response.error).toBe('Missing required parameters');
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
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
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

        expect(response.error).toBe('Missing required parameters');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Doing a POST with an invalid level should error', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {
            levelId: new ObjectId()
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

        expect(response.error).toBe('Level not found');
        expect(res.status).toBe(404);
      },
    });
  });

});
