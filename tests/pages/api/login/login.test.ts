import { NextApiRequestWrapper } from '@root/helpers/apiWrapper';
import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import handler from '../../../../pages/api/login/index';

beforeAll(async() => {
  await dbConnect();
});
afterAll(async() => {
  await dbDisconnect();
});
afterEach(() => {
  jest.restoreAllMocks();
});
enableFetchMocks();
describe('pages/api/login/index.ts', () => {
  jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
  test('Sending nothing should return 405', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req = {
          method: '',
          headers: {
            'content-type': 'application/json'
          }
        } as unknown as NextApiRequestWrapper;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Method not allowed');
        expect(res.status).toBe(405);
      }
    });
  });
  test('Sending blank creds should return 401', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req = {
          method: 'POST',
          headers: {
            key: process.env.SPECIAL_TOKEN
          }
        } as unknown as NextApiRequestWrapper;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Bad request');
        expect(res.status).toBe(400);
      }
    });
  });
  test('Sending incorrect username should return 401', async () => {
    const credsJSON = { name: 'awiejgpewajigo', password: 'BAD' };

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req = {
          method: 'POST',
          body: credsJSON,
          headers: {
            'content-type': 'application/json' // Must use correct content type
          },

        } as unknown as NextApiRequestWrapper;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        const response = await res.json();

        expect(response.error).toBe('Incorrect email or password');
        expect(res.status).toBe(401);
      }
    });
  });
  test('Sending incorrect password should return 401', async () => {
    const credsJSON = { name: 'test', password: 'BAD' };

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req = {
          method: 'POST',
          body: credsJSON,
          headers: {
            'content-type': 'application/json' // Must use correct content type
          },

        } as unknown as NextApiRequestWrapper;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Incorrect email or password');
        expect(res.status).toBe(401);
      }
    });
  });
  test('Sending correct creds should return 200', async () => {
    const credsJSON = { name: 'test', password: 'test1234' };

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req = {
          method: 'POST',
          body: credsJSON,
          headers: {
            'content-type': 'application/json' // Must use correct content type
          },

        } as unknown as NextApiRequestWrapper;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.success).toBe(true);
        expect(res.status).toBe(200);
      }
    });
  });
  test('Sending correct email creds should return 200', async () => {
    const credsJSON = { name: 'test@gmail.com', password: 'test1234' };

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req = {
          method: 'POST',
          body: credsJSON,
          headers: {
            'content-type': 'application/json' // Must use correct content type
          },

        } as unknown as NextApiRequestWrapper;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.success).toBe(true);
        expect(res.status).toBe(200);
      }
    });
  });
});
