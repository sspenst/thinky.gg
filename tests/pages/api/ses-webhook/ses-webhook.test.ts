import { NextApiRequestWrapper } from '@root/helpers/apiWrapper';
import { dbDisconnect } from '@root/lib/dbConnect';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import handler from '../../../../pages/api/ses-webhook/index';

const sampleJSON = {
  'Records': [{
    'EventVersion': '1.0',
    // there are more properties but not important
    'Sns': {
      'Message': JSON.stringify({ 'notificationType': 'Bounce',
        'bounce': {
          'feedbackId': 'feedbackIdValue',
          'bounceType': 'Transient',
          'bounceSubType': 'General',
          'bouncedRecipients': [
            {
              'emailAddress': 'test@test.com',
              'action': 'failed',
              'status': '0.0.0',
              'diagnosticCode': 'blah blah blah'
            }
          ],
          'timestamp': '2024-01-29T02:55:29.000Z',
          'remoteMtaIp': '999.999.99.99',
          'reportingMTA': 'dns; SOMETHING.smtp-out.amazonses.com'
        },
        'mail': {
          'timestamp': '2024-01-29T02:55:27.214Z',
          'source': 'do.not.reply@thinky.gg',
          'sourceArn': 'sourceArn',
          'sourceIp': 'sourceIp',
          'callerIdentity': 'root',
          'sendingAccountId': 'sendingAccountIdValue',
          'messageId': 'messageIdValue',
          'destination': [
            'test@test.com'
          ]
        }

      })
    }
  }] };

beforeAll(async () => {
  //await dbConnect(); // see if that erroneous index error goes away when commenting this out...
});
afterEach(() => {
  jest.restoreAllMocks();
});
afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();
describe('ses-webhook', () => {
  test('Bad secret', async () => {
    process.env.SES_WEBHOOK_SECRET = 'test';
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWrapper = {
          method: 'POST',
          query: {
            secret: 'wrong',
          },
          body: {
            payload: JSON.stringify(sampleJSON),
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

        expect(response.error).toBe('Unauthorized');
        expect(res.status).toBe(401);
      },
    });
  });
  test('Weird payload', async () => {
    process.env.SES_WEBHOOK_SECRET = 'test';
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWrapper = {
          method: 'POST',
          query: {
            secret: 'test',
          },
          body: {
            payload: JSON.stringify({ 'a': 1 }),
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

        expect(response.error).toBe('Error parsing payload from SES');
        expect(res.status).toBe(500);
      },
    });
  });
  test('Should unsubscribe user if they bounce', async () => {
    process.env.SES_WEBHOOK_SECRET = 'test';
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWrapper = {
          method: 'POST',
          query: {
            secret: 'test',
          },
          body: {
            payload: JSON.stringify(sampleJSON),
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

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response.bounced).toStrictEqual(['test@test.com']);
      },
    });
  });
});
