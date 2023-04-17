import Role from '@root/constants/role';
import TestId from '@root/constants/testId';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { UserModel } from '@root/models/mongoose';
import handler from '@root/pages/api/level/[id]/prostats/solves';
import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async() => {
  await dbDisconnect();
});
afterEach(() => {
  jest.restoreAllMocks();
});
enableFetchMocks();

describe('api/user/[id]/prostats/[type]', () => {
  test('bad query', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          query: {
            id: TestId.LEVEL,
          },
          cookies: {
            token: getTokenCookieValue(TestId.USER)
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

        expect(response.error).toBe('Invalid query.skip, query.steps');
        expect(res.status).toBe(400);
      },
    });
  });
  test('valid non-pro query', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          query: {
            id: TestId.LEVEL,
            skip: 0,
            steps: 20,
          },
          cookies: {
            token: getTokenCookieValue(TestId.USER)
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

        expect(response).toBeDefined();
        expect(response.length).toBe(1);
        expect(res.status).toBe(200);
      },
    });
  });
  test('invalid non-pro query', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          query: {
            id: TestId.LEVEL,
            skip: 0,
            steps: 22,
          },
          cookies: {
            token: getTokenCookieValue(TestId.USER)
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

        expect(response).toBeDefined();
        expect(response.length).toBe(0);
        expect(res.status).toBe(200);
      },
    });
  });
  test('valid pro query', async () => {
    await UserModel.findByIdAndUpdate(TestId.USER, {
      $addToSet: {
        roles: Role.PRO
      }
    });

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          query: {
            id: TestId.LEVEL,
            skip: 0,
            steps: 22,
          },
          cookies: {
            token: getTokenCookieValue(TestId.USER)
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

        expect(response).toBeDefined();
        expect(response.length).toBe(1);
        expect(res.status).toBe(200);
      },
    });
  });
});
