import { UserModel } from '@root/models/mongoose';
import { enableFetchMocks } from 'jest-fetch-mock';
import MockDate from 'mockdate';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import TestId from '../../../../constants/testId';
import { TimerUtil } from '../../../../helpers/getTs';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import withAuth, { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import modifyUserHandler from '../../../../pages/api/user/index';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async() => {
  await dbDisconnect();
});
enableFetchMocks();

const acceptMock = () => {
  return { rejected: [] };
};

const sendMailRefMock = { ref: acceptMock };

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockImplementation(() => ({
    sendMail: jest.fn().mockImplementation(() => {
      return sendMailRefMock.ref();
    }),
  })),
}));

describe('Testing a valid user', () => {
  test('Getting a valid user all the fields except password', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();

        const keys = Object.keys(response);

        keys.sort();
        // Important to keep this track of keys that we may add/remove in future
        expect(keys).toMatchObject([ '__v', '_id', 'calc_levels_created_count', 'calc_records', 'chapterUnlocked', 'config', 'email', 'last_visited_at', 'multiplayerProfile', 'name', 'notifications', 'roles', 'score', 'ts' ]);
        expect(response.last_visited_at).toBeGreaterThan(TimerUtil.getTs() - 30000);
        expect(response.name).toBe('test');
        expect(response.password).toBeUndefined();
        expect(res.status).toBe(200);
      },
    });
  });
  test('Changing email and username shouldn\'t error', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            name: 'newuser',
            email: 'test123@test.com',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.updated).toBe(true);
        expect(res.status).toBe(200);
      },
    });
  });
  test('Changing email too quickly should error', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            name: ' newuser3 ',
            email: '   test1234@test.com    ',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Error: Please wait a couple minutes before requesting another email confirmation');
        expect(res.status).toBe(500);
      },
    });
  });
  test('Changing username to blank username should error gracefully', async () => {
    // mock date
    const fiveMinFromNow = new Date().getTime() + 5 * 60 * 1000;

    MockDate.set(fiveMinFromNow);
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            name: ' ',
            email: '   test1234@test.com    ',
            currentPassword: 'test1234',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Username cannot be empty');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Changing email to blank username should error gracefully', async () => {
    // mock date
    const fiveMinFromNow = new Date().getTime() + 5 * 60 * 1000;

    MockDate.set(fiveMinFromNow);
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            name: ' eofwe ',
            email: '       ',
            currentPassword: 'test1234',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Email cannot be empty');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Changing username to existing username should error gracefully', async () => {
    // mock date
    const fiveMinFromNow = new Date().getTime() + 5 * 60 * 1000;

    MockDate.set(fiveMinFromNow);
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            name: 'BBB',
            email: '   test1234@test.com    ',
            currentPassword: 'test1234',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Username already taken');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Changing email to existing email should error gracefully', async () => {
    // mock date
    const fiveMinFromNow = new Date().getTime() + 5 * 60 * 1000;

    MockDate.set(fiveMinFromNow);
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            name: 'newuser4',
            email: '   bbb@gmail.com    ',
            currentPassword: 'test1234',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Email already taken');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Changing username and email to have trailing spaces shouldn\'t error (but should trim on backend)', async () => {
    // mock date
    const fiveMinFromNow = new Date().getTime() + 5 * 60 * 1000;

    MockDate.set(fiveMinFromNow);
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            name: ' newuser3 ',
            email: '   test1234@test.com    ',
            currentPassword: 'test1234',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.updated).toBe(true);
        expect(res.status).toBe(200);
      },
    });
  });
  test('Changing password', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            name: ' newuser3 ',
            currentPassword: 'test1234',
            password: 'newpassword'
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.updated).toBe(true);
        expect(res.status).toBe(200);
      },
    });
  });
  test('Changing password again but with incorrect currentPass', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            name: ' newuser3 ',
            currentPassword: 'testincorrect',
            password: 'newpassword'
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Incorrect email or password');
        expect(res.status).toBe(401);
      },
    });
  });
  test('Getting a user now should show the reflected changes', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();

        const keys = Object.keys(response);

        keys.sort();
        // Important to keep this track of keys that we may add/remove in future
        expect(keys).toMatchObject([ '__v', '_id', 'calc_levels_created_count', 'calc_records', 'chapterUnlocked', 'config', 'email', 'last_visited_at', 'multiplayerProfile', 'name', 'notifications', 'roles', 'score', 'ts' ]);
        expect(response.name).toBe('newuser3');
        expect(response.last_visited_at).toBeGreaterThan(TimerUtil.getTs() - 30000);
        expect(response.password).toBeUndefined();
        expect(res.status).toBe(200);
      },
    });
  });
  test('Changing hideStatus and bio', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            bio: 'I am a bio...',
            hideStatus: true
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.updated).toBe(true);
        expect(res.status).toBe(200);
      },
    });
  });
  test('Changing stuff but updateOne errors', async () => {
    const originalImplementation = UserModel.findOneAndUpdate;

    jest.spyOn(UserModel, 'findOneAndUpdate')
      .mockImplementationOnce(function (this: typeof UserModel, ...args) {
      // Call the original implementation for the first call
        return originalImplementation.apply(this, args);
      })
      .mockImplementationOnce(() => {
        throw new Error('test error');
      });
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            bio: 'I am a bio (should not work)...',
            hideStatus: true
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Error: test error');

        expect(res.status).toBe(500);
      },
    });
  });
  test('Getting a user now should not have their last_visited_at', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();

        const keys = Object.keys(response);

        keys.sort();
        // Important to keep this track of keys that we may add/remove in future
        expect(keys).toContain('hideStatus');
        expect(response.bio).toBe('I am a bio...');
        expect(response.last_visited_at).toBeUndefined();
        expect(res.status).toBe(200);
      },
    });
  });
  test('withAuth', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    const handler = withAuth({ GET: {} }, () => {
      throw new Error('ERROR!!!');
    });

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
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

        expect(res.status).toBe(500);
        expect(response.error).toBe('Unauthorized: Unknown error');
      },
    });
  });
});
