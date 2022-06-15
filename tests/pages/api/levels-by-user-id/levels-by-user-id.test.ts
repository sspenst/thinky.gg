import { LevelModel } from '../../../../models/mongoose';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { ObjectId } from 'bson';
import { dbDisconnect } from '../../../../lib/dbConnect';
import { enableFetchMocks } from 'jest-fetch-mock';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import levelsByUserId from '../../../../pages/api/levels-by-user-id/[id]';
import { testApiHandler } from 'next-test-api-route-handler';

const USER_ID_FOR_TESTING = '600000000000000000000000';

afterEach(() => {
  jest.restoreAllMocks();
});
afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();

describe('Testing levels by user id api', () => {
  test('Calling with wrong http method should fail', async () => {
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

        await levelsByUserId(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Method not allowed');
        expect(res.status).toBe(405);
      },
    });
  });
  test('Calling without query should return 400', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await levelsByUserId(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Missing required parameters');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Calling without query.id should return 400', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {

          },
          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await levelsByUserId(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Missing required parameters');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Calling with query.id that does not exist should return an empty array', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: new ObjectId().toString(),
          },
          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await levelsByUserId(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response).toEqual([]);
        expect(res.status).toBe(200);
      },
    });
  });
  test('Calling with query.id that does not exist should return an empty array', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: USER_ID_FOR_TESTING,
          },
          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await levelsByUserId(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.length).toEqual(1);
        expect(res.status).toBe(200);
      },
    });
  });

  test('Calling when query somehow throws error should be handled gracefully', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(LevelModel, 'find').mockReturnValueOnce({ 'thisobjectshouldthrowerror': true } as any);

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: USER_ID_FOR_TESTING,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await levelsByUserId(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Error finding Levels by userId');
        expect(res.status).toBe(500);
      },
    });
  });
  test('Calling when query somehow returns null out should be handled gracefully', async () => {
    jest.spyOn(LevelModel, 'find').mockReturnValueOnce({
      sort: function() {
        return null;
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any) ;

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: USER_ID_FOR_TESTING,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await levelsByUserId(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Error finding Levels by userId');
        expect(res.status).toBe(500);
      },
    });
  });
});
