import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { RecordModel } from '../../../../models/mongoose';
import recordsHandler from '../../../../pages/api/records/[id]';

afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();

describe('Testing records token handler', () => {
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

        await recordsHandler(req, res);
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
          query: {
            id: TestId.LEVEL,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await recordsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.length).toBe(1);
        expect(response[0]._id).toBe(TestId.RECORD);
        expect(response[0].levelId).toBe(TestId.LEVEL);
        expect(response[0].moves).toBe(20);
        expect(response[0].userId._id.toString()).toBe(TestId.USER);
        expect(response[0].userId.name.toString()).toBe('test');
        expect(res.status).toBe(200);
      },
    });
  });
  test('If mongo query returns null we should fail gracefully', async () => {
    jest.spyOn(RecordModel, 'find').mockReturnValueOnce({
      populate: function() {
        return { sort: function() {
          return null;
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
          query: {
            id: TestId.LEVEL,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await recordsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Error finding Records');
        expect(res.status).toBe(404);
      },
    });
  });
  test('If mongo query throw exception we should fail gracefully', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(RecordModel, 'find').mockReturnValueOnce({ 'thisobjectshouldthrowerror': true } as any);

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.LEVEL,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await recordsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Error finding Records');
        expect(res.status).toBe(500);
      },
    });
  });
});
