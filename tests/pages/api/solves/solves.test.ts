import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import TestId from '../../../../constants/testId';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { StatModel } from '../../../../models/mongoose';
import solvesHandler from '../../../../pages/api/solves/[id]';

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

describe('Testing records token handler', () => {
  jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

  test('Calling with wrong http method should fail', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
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

        await solvesHandler(req, res);
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
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            all: 'false',
            id: TestId.LEVEL,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await solvesHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.length).toBe(1);
        expect(response[0].complete).toBeTruthy();
        expect(response[0].levelId).toBe(TestId.LEVEL);
        expect(response[0].moves).toBe(20);
        expect(response[0].userId._id.toString()).toBe(TestId.USER);
        expect(response[0].userId.name.toString()).toBe('test');
        expect(res.status).toBe(200);
      },
    });
  });
  test('If mongo query throw exception we should fail gracefully', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(StatModel, 'aggregate').mockReturnValueOnce({ 'thisobjectshouldthrowerror': true } as any);

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            all: 'true',
            id: TestId.LEVEL,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await solvesHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Error finding solves');
        expect(res.status).toBe(500);
      },
    });
  });
});
