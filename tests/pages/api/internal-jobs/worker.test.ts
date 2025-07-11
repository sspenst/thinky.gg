import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import QueueMessage from '../../../../models/db/queueMessage';
import { QueueMessageModel } from '../../../../models/mongoose';
import { QueueMessageState } from '../../../../models/schemas/queueMessageSchema';
import handler, { processQueueMessages } from '../../../../pages/api/internal-jobs/worker';
import { queueFetch } from '../../../../pages/api/internal-jobs/worker/queueFunctions';

afterEach(() => {
  jest.restoreAllMocks();
});
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

describe('Worker test', () => {
  test('Calling worker with no secret should fail', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          query: {
            secret: 'nope'
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
        const resp = await res.json();

        expect(res.status).toBe(401);
        expect(resp.error).toBe('Unauthorized');
      },
    });
  });
  test('Calling worker with no jobs should return 200', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          query: {
            secret: process.env.INTERNAL_JOB_TOKEN_SECRET_EMAILDIGEST
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
        const resp = await res.json();

        expect(res.status).toBe(200);
        expect(resp.message).toBe('NONE');
      },
    });
  });
  test('Calling worker with a failing job should handle gracefully', async () => {
    await queueFetch('sample', {}, 'sampleKey');
    fetchMock.mockOnce(JSON.stringify({ error: 'error' }), { status: 500 });
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          query: {
            secret: process.env.INTERNAL_JOB_TOKEN_SECRET_EMAILDIGEST
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
        const resp = await res.json();
        const messages = await QueueMessageModel.find();

        expect(res.status).toBe(200);
        expect(resp.message).toBe('Processed 1 messages with 1 errors');
        expect(messages.length).toBe(1);
        const msg = messages[0] as QueueMessage;

        expect(msg.state).toBe(QueueMessageState.PENDING);
        expect(msg.processingAttempts).toBe(1);
        expect(msg.processingStartedAt).toBeDefined();
        expect(msg.log).toHaveLength(1);
        expect(msg.log[0]).toBe('sample: 500 Internal Server Error');
      },
    });
  });
  test('Calling worker with a failing job a SECOND time should handle gracefully', async () => {
    await queueFetch('sample', {}, 'sampleKey'); // should get deduped due to same key
    // clear existing fetchMocks
    //fetchMock.mockOnce(JSON.stringify({ error: 'error' }), { status: 404 });
    fetchMock.mockRejectOnce(new Error('mock error'));
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          query: {
            secret: process.env.INTERNAL_JOB_TOKEN_SECRET_EMAILDIGEST
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
        const resp = await res.json();

        expect(res.status).toBe(200);
        expect(resp.message).toBe('Processed 1 messages with 1 errors'); // should be deduped
        const messages = await QueueMessageModel.find();

        expect(messages.length).toBe(1);
        const msg = messages[0] as QueueMessage;

        expect(msg.state).toBe(QueueMessageState.PENDING);
        expect(msg.processingAttempts).toBe(2);
        expect(msg.log).toHaveLength(2);
        expect(msg.log[0]).toBe('sample: 500 Internal Server Error');
        expect(msg.log[1]).toBe('sample: mock error');
      },
    });
  });
  test('Calling worker with a failing job a THIRD time should handle gracefully and mark it failed', async () => {
    await queueFetch('sample', {}, 'sampleKey'); // should get deduped due to same key
    fetchMock.mockOnce(JSON.stringify({ error: 'error' }), { status: 418 });
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          query: {
            secret: process.env.INTERNAL_JOB_TOKEN_SECRET_EMAILDIGEST
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
        const resp = await res.json();

        expect(res.status).toBe(200);
        expect(resp.message).toBe('Processed 1 messages with 1 errors'); // should be deduped
        const messages = await QueueMessageModel.find();

        expect(messages.length).toBe(1);
        const msg = messages[0] as QueueMessage;

        expect(msg.processingAttempts).toBe(3);
        expect(msg.log).toHaveLength(3);
        expect(msg.log[0]).toBe('sample: 500 Internal Server Error');
        expect(msg.log[1]).toBe('sample: mock error');
        expect(msg.log[2]).toBe('sample: 418 I\'m a Teapot');
        expect(msg.isProcessing).toBe(false);
        expect(msg.state).toBe(QueueMessageState.FAILED);
      },
    });
  });
  test('Now should get NONE', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          query: {
            secret: process.env.INTERNAL_JOB_TOKEN_SECRET_EMAILDIGEST
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
        const resp = await res.json();

        expect(res.status).toBe(200);
        expect(resp.message).toBe('NONE');
      },
    });
  });
  test('Now creating the same job again but this time we are going to mock the fetch', async () => {
    await queueFetch('sample', {}, 'sampleKey'); // should NOT get deduped due to pending state
    fetchMock.mockOnce(JSON.stringify({ message: 'success' }), { status: 200 });

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          query: {
            secret: process.env.INTERNAL_JOB_TOKEN_SECRET_EMAILDIGEST
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
        const resp = await res.json();

        expect(res.status).toBe(200);
        expect(resp.message).toBe('Processed 1 messages with no errors');
        const messages = await QueueMessageModel.find();

        expect(messages.length).toBe(2);
        const msg = messages[1] as QueueMessage;

        expect(msg.state).toBe(QueueMessageState.COMPLETED);
      },
    });
  });
  test('Queue again, but this time let us have status code 404', async () => {
    await queueFetch('sample', {}, 'sampleKey'); // should NOT get deduped due to pending state
    fetchMock.mockOnce(JSON.stringify({ message: 'error' }), { status: 404 });

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          query: {
            secret: process.env.INTERNAL_JOB_TOKEN_SECRET_EMAILDIGEST
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
        const resp = await res.json();

        expect(res.status).toBe(200);
        expect(resp.message).toBe('Processed 1 messages with 1 errors');
        const messages = await QueueMessageModel.find();

        expect(messages.length).toBe(3);
        const msg = messages[2] as QueueMessage;

        expect(msg.state).toBe(QueueMessageState.PENDING);
        expect(msg.log).toHaveLength(1);
        expect(msg.log[0]).toBe('sample: 404 Not Found');
      },
    });
  });
  test('Creating 15 messages to see limit', async () => {
    const promises = [];

    for (let i = 0; i < 25; i++) {
      promises.push(queueFetch('sample', {}, `sampleKey${i}`));
    }

    await Promise.all(promises);
    await processQueueMessages();
    const allMessagesProcessing = await QueueMessageModel.find({ processingAttempts: 1 }, {}, { sort: { createdAt: 1 } });

    expect(allMessagesProcessing.length).toBe(20);
  });
  test('mocking error in fetching from db queue messages', async () => {
    jest.spyOn(QueueMessageModel, 'find').mockImplementationOnce(() => {
      throw new Error('mock error');
    });
    // expect logger Error to be called
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    // expect logger error to be called exactly once

    await processQueueMessages();
    expect(logger.error).toBeCalledTimes(1);
  });
});
