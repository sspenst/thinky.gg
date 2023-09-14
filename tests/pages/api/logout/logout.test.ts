import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import handler from '../../../../pages/api/logout/index';

afterAll(async() => {
  await dbDisconnect();
});
afterEach(() => {
  jest.restoreAllMocks();
});
beforeAll(async () => {
  await dbConnect();
});
enableFetchMocks();
describe('Testing logout api', () => {
  jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

  test('Sending nothing should return 405', async () => {
    await testApiHandler({
      handler: handler,
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Method not allowed');
        expect(res.status).toBe(405);
      }
    });
  });

  test('Sending correct data should return 200', async () => {
    const credsJSON = { name: 'test', password: 'test' };

    await testApiHandler({
      handler: handler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          body: JSON.stringify(credsJSON),
          headers: {
            'content-type': 'application/json',
            'host': '127.0.0.1:3000'
          }
        });
        const response = await res.json();

        expect(response.success).toBe(true);
        expect(res.status).toBe(200);
      }
    });
  });
});
