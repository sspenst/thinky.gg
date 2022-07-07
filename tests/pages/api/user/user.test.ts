import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { enableFetchMocks } from 'jest-fetch-mock';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import getTs from '../../../../helpers/getTs';
import modifyUserHandler from '../../../../pages/api/user/index';
import { testApiHandler } from 'next-test-api-route-handler';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async() => {
  await dbDisconnect();
});
enableFetchMocks();
const USER_ID_FOR_TESTING = '600000000000000000000000';

describe('Testing a valid user', () => {
  test('Getting a valid user all the fields except password', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();

        const keys = Object.keys(response);

        keys.sort();
        // Important to keep this track of keys that we may add/remove in future
        expect(keys).toMatchObject([ '__v', '_id', 'calc_records', 'email', 'isOfficial', 'last_visited_at', 'name', 'score', 'ts' ]);
        expect(response.last_visited_at).toBeGreaterThan(getTs() - 30000);

        expect(response.name).toBe('test');
        expect(response.email).toBe('test@gmail.com');

        expect(response.password).toBeUndefined();
        expect(res.status).toBe(200);
      },
    });
  });
  test('Changing email and username shouldn\'t error', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {
            name: 'newuser',
            email: 'test123@test.com',
            currentPassword: 'test',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.updated).toBe(true);
        expect(res.status).toBe(200);
      },
    });
  });
  test('Changing username and email to have trailing spaces shouldn\'t error (but should trim on backend)', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {
            name: ' newuser3 ',
            email: '   test1234@test.com    ',
            currentPassword: 'test',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.updated).toBe(true);
        expect(res.status).toBe(200);
      },
    });
  });
  test('Getting a user now should show the reflected changes', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();

        const keys = Object.keys(response);

        keys.sort();
        // Important to keep this track of keys that we may add/remove in future
        expect(keys).toMatchObject([ '__v', '_id', 'calc_records', 'email', 'isOfficial', 'last_visited_at', 'name', 'score', 'ts' ]);

        expect(response.name).toBe('newuser3');
        expect(response.email).toBe('test1234@test.com');
        expect(response.last_visited_at).toBeGreaterThan(getTs() - 30000);
        expect(response.password).toBeUndefined();
        expect(res.status).toBe(200);
      },
    });
  });
});
