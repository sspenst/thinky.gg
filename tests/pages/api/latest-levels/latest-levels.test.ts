import { ObjectId } from 'bson';
import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import getTs from '../../../../helpers/getTs';
import { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { LevelModel } from '../../../../models/mongoose';
import latestLevelsHandler from '../../../../pages/api/latest-levels/index';

afterEach(() => {
  jest.restoreAllMocks();
});
afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();

describe('Testing latest levels api', () => {
  test('Calling with wrong http method should fail', async () => {
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

        await latestLevelsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Method not allowed');
        expect(res.status).toBe(405);
      },
    });
  });
  test('Calling with correct http method should be OK', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await latestLevelsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.length).toBe(1);
        expect(res.status).toBe(200);
      },
    });
  });
  test('Should always be limited to 10 levels and should only return drafts', async () => {
    for (let i = 0; i < 25; i++) {
      await LevelModel.create({
        _id: new ObjectId(),
        authorNote: 'level ' + i + ' author note',
        data: '40000\n12000\n05000\n67890\nABCD3',
        height: 5,
        isDraft: i % 2 === 0,
        leastMoves: 20,
        name: 'level ' + i,
        points: 0,
        slug: 'test/level-' + i,
        ts: getTs(),
        userId: TestId.USER,
        width: 5,
      });
    }

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await latestLevelsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.length).toBe(10);
        expect(res.status).toBe(200);

        for (let i = 0; i < response.length; i++) {
          const lvlDB = await LevelModel.findById(response[i]._id);

          expect(lvlDB.isDraft).toBe(false);
        }
      },
    });
  }, 30000);
  test('If mongo query returns null we should fail gracefully', async () => {
    jest.spyOn(LevelModel, 'find').mockReturnValueOnce({
      populate: function() {
        return {
          sort: function() {
            return { limit: function() {
              return null;
            }
            };
          }
        };
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await latestLevelsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Error finding Levels');
        expect(res.status).toBe(500);
      },
    });
  });
  test('If mongo query throw exception we should fail gracefully', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(LevelModel, 'find').mockReturnValueOnce({ 'thisobjectshouldthrowerror': true } as any);

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await latestLevelsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Error finding Levels');
        expect(res.status).toBe(500);
      },
    });
  });
});
