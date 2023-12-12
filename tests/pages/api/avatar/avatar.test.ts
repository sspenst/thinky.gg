import { GameId } from '@root/constants/GameId';
import { NextApiRequestGuest } from '@root/helpers/apiWrapper';
import { enableFetchMocks } from 'jest-fetch-mock';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import TestId from '../../../../constants/testId';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { ImageModel } from '../../../../models/mongoose';
import handler from '../../../../pages/api/avatar/[id]';

beforeAll(async () => {
  await dbConnect();
});
afterEach(() => {
  jest.restoreAllMocks();
});
afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();

describe('avatar test', () => {
  test('Calling with wrong http method should fail', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestGuest = {
          method: 'POST',
          gameId: GameId.PATHOLOGY,
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
  test('Calling with correct http method without query should fail', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestGuest = {
          gameId: GameId.PATHOLOGY,
          method: 'GET',
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Invalid query.id');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Calling with correct http method with query but no id should fail', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestGuest = {
          gameId: GameId.PATHOLOGY,
          method: 'GET',
          query: {

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

        expect(response.error).toBe('Invalid query.id');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Calling with correct http method with query but bad id should fail', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestGuest = {
          gameId: GameId.PATHOLOGY,
          method: 'GET',
          query: {
            id: 'bad id',
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

        expect(response.error).toBe('Invalid query.id');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Calling with correct http method with query but valid id but not exist should fail', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestGuest = {
          gameId: GameId.PATHOLOGY,
          method: 'GET',
          query: {
            id: new Types.ObjectId().toString(),
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

        expect(response.error).toBe('User not found');
        expect(res.status).toBe(404);
      },
    });
  });
  test('Calling with correct http method with query but correct id should work', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestGuest = {
          gameId: GameId.PATHOLOGY,
          method: 'GET',
          query: {
            id: TestId.USER,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        // should success

        expect(res.status).toBe(200);
      },
    });
  });
  test('Calling with correct http method with query but correct id with mocked image response should work', async () => {
    await ImageModel.create({
      _id: new Types.ObjectId(),
      documentId: TestId.USER,
      image: 'image',
      ts: Date.now(),
    });

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestGuest = {
          gameId: GameId.PATHOLOGY,
          method: 'GET',
          query: {
            id: TestId.USER,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        // should success, check the raw buffer
        const response = await res.buffer();

        expect(response.toString()).toBe('image');
        // check content length and content type
        expect(res.headers.get('content-type')).toBe('image/png');
        expect(res.headers.get('content-length')).toBe('5');
        // check cache control
        expect(res.headers.get('cache-control')).toBe('public, max-age=1209600');
        // check Expires header exists
        expect(res.headers.get('expires')).toBeTruthy();
        expect(res.status).toBe(200);
      },
    });
  });
});
