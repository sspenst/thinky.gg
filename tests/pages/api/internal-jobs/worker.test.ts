import { testApiHandler } from 'next-test-api-route-handler';
import { dbDisconnect } from '../../../../lib/dbConnect';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { QueueMessage, QueueMessageState } from '../../../../models/db/queueMessage';
import { QueueMessageModel } from '../../../../models/mongoose';
import handler, { queueFetch } from '../../../../pages/api/internal-jobs/worker';

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(async() => {
  await dbDisconnect();
});
afterEach(() => {
  jest.restoreAllMocks();
});
describe('Worker test', () => {
  test('Calling worker with no secret should fail', async () => {
    await testApiHandler({
      handler: async (_, res) => {
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
      handler: async (_, res) => {
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
    await testApiHandler({
      handler: async (_, res) => {
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

        expect(messages.length).toBe(1);
        const msg = messages[0] as QueueMessage;

        expect(msg.state).toBe(QueueMessageState.PENDING);
        expect(msg.processingAttempts).toBe(1);
        expect(msg.log).toHaveLength(1);
        expect(msg.log[0]).toBe('sample: Failed to parse URL from sample');
      },
    });
  });
  test('Calling worker with a failing job a SECOND time should handle gracefully', async () => {
    await queueFetch('sample', {}, 'sampleKey'); // should get deduped due to same key
    await testApiHandler({
      handler: async (_, res) => {
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
        expect(msg.log[0]).toBe('sample: Failed to parse URL from sample');
        expect(msg.log[1]).toBe('sample: Failed to parse URL from sample');
      },
    });
  });
  test('Calling worker with a failing job a THIRD time should handle gracefully and mark it failed', async () => {
    await queueFetch('sample', {}, 'sampleKey'); // should get deduped due to same key
    await testApiHandler({
      handler: async (_, res) => {
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

        expect(msg.state).toBe(QueueMessageState.FAILED);
        expect(msg.processingAttempts).toBe(3);
        expect(msg.log).toHaveLength(3);
        expect(msg.log[0]).toBe('sample: Failed to parse URL from sample');
        expect(msg.log[1]).toBe('sample: Failed to parse URL from sample');
        expect(msg.log[2]).toBe('sample: Failed to parse URL from sample');
      },
    });
  });
  test('Now should get NONE', async () => {
    await testApiHandler({
      handler: async (_, res) => {
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
    jest.spyOn(global, 'fetch').mockImplementation(() => Promise.resolve({
      status: 200,
      json: () => Promise.resolve({
        data: {}
      })
    } as unknown as Response));

    await testApiHandler({
      handler: async (_, res) => {
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
    jest.spyOn(global, 'fetch').mockImplementation(() => Promise.resolve({
      status: 404,
      statusText: 'Not Found',
      json: () => Promise.resolve({
        data: {
          message: 'Not found'
        }
      })
    } as unknown as Response));

    await testApiHandler({
      handler: async (_, res) => {
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
});
