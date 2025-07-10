import { GameId } from '@root/constants/GameId';
import TestId from '@root/constants/testId';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { KeyValueModel } from '@root/models/mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import handler from '../../../../pages/api/admin/config';

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});

afterEach(async () => {
  // Clean up any test data
  await KeyValueModel.deleteMany({ gameId: GameId.THINKY });
});

describe('Testing admin config API', () => {
  // Authentication & Authorization tests
  test('should reject non-admin user', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
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

        expect(response.error).toBe('Not authorized');
        expect(res.status).toBe(401);
      },
    });
  });

  test('should reject unauthenticated user', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
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

        expect(response.error).toBe('Unauthorized: No token provided');
        expect(res.status).toBe(401);
      },
    });
  });

  test('should reject invalid HTTP method', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PATCH',
          cookies: {
            token: getTokenCookieValue(TestId.USER_ADMIN),
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

        expect(response.error).toBe('Method not allowed');
        expect(res.status).toBe(405);
      },
    });
  });

  // GET tests
  test('should return empty array when no variables exist', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER_ADMIN),
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

        expect(response).toEqual([]);
        expect(res.status).toBe(200);
      },
    });
  });

  test('should return system variables for THINKY game', async () => {
    // Create test data
    await KeyValueModel.create([
      { gameId: GameId.THINKY, key: 'test_key_1', value: 'test_value_1' },
      { gameId: GameId.THINKY, key: 'test_key_2', value: 'test_value_2' },
    ]);

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER_ADMIN),
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

        expect(response).toHaveLength(2);
        expect(response[0]).toHaveProperty('key');
        expect(response[0]).toHaveProperty('value');
        expect(response[0]).toHaveProperty('createdAt');
        expect(response[0]).toHaveProperty('updatedAt');
        expect(res.status).toBe(200);
      },
    });
  });

  // POST tests
  test('should create new system variable', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER_ADMIN),
          },
          body: {
            key: 'new_test_key',
            value: 'new_test_value',
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

        expect(response.key).toBe('new_test_key');
        expect(response.value).toBe('new_test_value');
        expect(response.gameId).toBe(GameId.THINKY);
        expect(res.status).toBe(201);
      },
    });
  });

  test('should fail to create variable with missing key', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER_ADMIN),
          },
          body: {
            value: 'test_value',
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

        expect(response.error).toBe('Invalid body.key');
        expect(res.status).toBe(400);
      },
    });
  });

  test('should fail to create variable with existing key', async () => {
    // Create existing variable
    await KeyValueModel.create({
      gameId: GameId.THINKY,
      key: 'existing_key',
      value: 'existing_value',
    });

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER_ADMIN),
          },
          body: {
            key: 'existing_key',
            value: 'new_value',
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

        expect(response.error).toBe('Key already exists');
        expect(res.status).toBe(400);
      },
    });
  });

  // PUT tests
  test('should update existing system variable', async () => {
    // Create test variable
    const testVariable = await KeyValueModel.create({
      gameId: GameId.THINKY,
      key: 'update_test',
      value: 'original_value',
    });

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER_ADMIN),
          },
          body: {
            id: testVariable._id.toString(),
            key: 'updated_key',
            value: 'updated_value',
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

        expect(response.key).toBe('updated_key');
        expect(response.value).toBe('updated_value');
        expect(res.status).toBe(200);
      },
    });
  });

  test('should fail to update with missing parameters', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER_ADMIN),
          },
          body: {
            id: '507f1f77bcf86cd799439011',
            key: 'test_key',
            // missing value
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

        expect(response.error).toBe('Invalid body.value');
        expect(res.status).toBe(400);
      },
    });
  });

  test('should fail to update non-existent variable', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER_ADMIN),
          },
          body: {
            id: '507f1f77bcf86cd799439011',
            key: 'test_key',
            value: 'test_value',
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

        expect(response.error).toBe('Key/value pair not found');
        expect(res.status).toBe(404);
      },
    });
  });

  test('should fail to update with duplicate key', async () => {
    // Create two test variables
    const variable1 = await KeyValueModel.create({
      gameId: GameId.THINKY,
      key: 'key1',
      value: 'value1',
    });

    await KeyValueModel.create({
      gameId: GameId.THINKY,
      key: 'key2',
      value: 'value2',
    });

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER_ADMIN),
          },
          body: {
            id: variable1._id.toString(),
            key: 'key2', // This key already exists
            value: 'updated_value',
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

        expect(response.error).toBe('Key already exists');
        expect(res.status).toBe(400);
      },
    });
  });

  // DELETE tests
  test('should delete system variable', async () => {
    // Create test variable
    const testVariable = await KeyValueModel.create({
      gameId: GameId.THINKY,
      key: 'delete_test',
      value: 'test_value',
    });

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          cookies: {
            token: getTokenCookieValue(TestId.USER_ADMIN),
          },
          body: {
            id: testVariable._id.toString(),
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

        expect(response.success).toBe(true);
        expect(res.status).toBe(200);

        // Verify the variable was deleted
        const deletedVariable = await KeyValueModel.findById(testVariable._id);

        expect(deletedVariable).toBeNull();
      },
    });
  });

  test('should fail to delete without ID', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          cookies: {
            token: getTokenCookieValue(TestId.USER_ADMIN),
          },
          body: {
            // missing id
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

        expect(response.error).toBe('Invalid body.id');
        expect(res.status).toBe(400);
      },
    });
  });

  test('should fail to delete non-existent variable', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          cookies: {
            token: getTokenCookieValue(TestId.USER_ADMIN),
          },
          body: {
            id: '507f1f77bcf86cd799439011',
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

        expect(response.error).toBe('Key/value pair not found');
        expect(res.status).toBe(404);
      },
    });
  });
});
