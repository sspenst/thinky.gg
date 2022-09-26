import { testApiHandler } from 'next-test-api-route-handler';
import { logger } from '../../../../helpers/logger';
import { dbDisconnect } from '../../../../lib/dbConnect';
import handler from '../../../../pages/api/logout/index';

afterAll(async() => {
  await dbDisconnect();
});
afterEach(() => {
  jest.restoreAllMocks();
});
describe('Testing logout api', () => {
  jest.spyOn(logger, 'error').mockImplementation(() => ({} as any));

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
            'host': 'localhost:3000'
          }
        });
        const response = await res.json();

        expect(response.success).toBe(true);
        expect(res.status).toBe(200);
      }
    });
  });
});
