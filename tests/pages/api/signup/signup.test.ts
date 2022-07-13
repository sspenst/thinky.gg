import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { enableFetchMocks } from 'jest-fetch-mock';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import loginUserHandler from '../../../../pages/api/login/index';
import signupUserHandler from '../../../../pages/api/signup/index';
import { testApiHandler } from 'next-test-api-route-handler';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async() => {
  await dbDisconnect();
});
enableFetchMocks();
const USER_ID_FOR_TESTING = '600000000000000000000000';

describe('pages/api/world/index.ts', () => {
  const cookie = getTokenCookieValue(USER_ID_FOR_TESTING);

  test('Signup on non POST endpoint', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: cookie,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await signupUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Method not allowed');
        expect(res.status).toBe(405);
      },
    });
  });
  test('Creating a user without a body should fail with 400', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: cookie,
          },

          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await signupUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Error creating user');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Creating a user with missing parameters should fail', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: cookie,
          },
          body: {
            name: 'test',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await signupUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Missing required fields');
        expect(res.status).toBe(401);
      },
    });
  });
  test('Creating a user that already exists should fail', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: cookie,
          },
          body: {
            name: 'test',
            email: 'test@test.com',
            password: 'password',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await signupUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(401);
        expect(response.error).toBe('Username or email already exists');
      },
    });
  });
  test('Creating a user with valid parameters should work', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: cookie,
          },
          body: {
            name: 'test2',
            email: 'test2@test.com',
            password: 'password2',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await signupUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(200);
      },
    });
  });
  test('We should be able to login with the newly created user', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          body: {
            name: 'test2',
            password: 'password2'
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await loginUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response.success).toBeDefined();
      },
    });
  });
  test('We should be able to login with if spaces are around the user name', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          body: {
            name: '  test2  ',
            password: 'password2'
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await loginUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response.success).toBeDefined();
      },
    });
  });
});
