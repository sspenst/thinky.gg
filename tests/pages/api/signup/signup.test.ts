import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import { Games } from '@root/constants/Games';
import NotificationType from '@root/constants/notificationType';
import UserConfig from '@root/models/db/userConfig';
import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import TestId from '../../../../constants/testId';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { UserConfigModel, UserModel } from '../../../../models/mongoose';
import loginUserHandler from '../../../../pages/api/login/index';
import signupUserHandler from '../../../../pages/api/signup/index';

beforeAll(async () => {
  await dbConnect();
});
beforeEach(async () => {
  process.env.RECAPTCHA_SECRET = '';
});
afterAll(async() => {
  await dbDisconnect();
});
afterEach(() => {
  //jest.restoreAllMocks();
});
enableFetchMocks();

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockImplementation(() => ({
    sendMail: jest.fn().mockImplementation(() => {
      return { rejected: [] };
    }),
  })),
}));

describe('pages/api/signup', () => {
  const cookie = getTokenCookieValue(TestId.USER);

  test('Creating a user without a body should fail with 400', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: cookie,
          },

          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await signupUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Bad request');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Creating a user with missing parameters should fail', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: cookie,
          },
          body: {
            name: 'test',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await signupUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Invalid body.email, body.password');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Creating a user with existing email should fail', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: cookie,
          },
          body: {
            name: 'test_new',
            email: 'test@gmail.com',
            password: 'password',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await signupUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Email already exists');
        expect(res.status).toBe(401);
      },
    });
  });
  test('Creating a user with existing username should fail', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: cookie,
          },
          body: {
            name: 'test',
            email: 'test@test.com',
            password: 'password',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await signupUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(401);
        expect(response.error).toBe('Username already exists');
      },
    });
  });
  test('Creating a user with existing email should fail but send email', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: cookie,
          },
          body: {
            name: 'testblah',
            email: 'someolduser@someolduser.com',
            password: 'password',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await signupUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response.error).toBe('We tried emailing you a reset password link. If you still have problems please contact ' + Games[DEFAULT_GAME_ID].displayName + ' devs via Discord.');
      },
    });
  });
  test('Creating a user with bonkers name should NOT work (and return a 500 due to validation failure)', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    // Suppress logger errors for this test
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: cookie,
          },
          body: {
            name: 'Space Space',
            email: 'test5@test.com',
            password: 'password2',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await signupUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(500);
      },
    });
  });
  test('Creating a user with valid parameters should work', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: cookie,
          },
          body: {
            name: 'Test2',
            email: 'test2@test.com',
            password: 'password2',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await signupUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(200);
        const db = await UserModel.findOne({ email: 'test2@test.com' });

        expect(db).toBeDefined();
        expect(db.name).toBe('Test2');
        expect(db.password).not.toBe('password2'); // should be salted
        const config = await UserConfigModel.findOne({ userId: db._id }) as UserConfig;

        expect(config).toBeDefined();
        expect(config.gameId).toBe(DEFAULT_GAME_ID);

        const disallowedEmailNotifications = [
          NotificationType.NEW_FOLLOWER,
          NotificationType.NEW_LEVEL,
          NotificationType.NEW_LEVEL_ADDED_TO_COLLECTION,
          NotificationType.NEW_RECORD_ON_A_LEVEL_YOU_SOLVED,
          NotificationType.NEW_REVIEW_ON_YOUR_LEVEL,
        ];

        expect(db.disallowedEmailNotifications.sort()).toStrictEqual(disallowedEmailNotifications);
        expect(db.disallowedPushNotifications).toStrictEqual([]);
      },
    });
  });
  test('We should be able to login with the newly created user', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          body: {
            name: 'test2',
            password: 'password2'
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await loginUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response.success).toBeDefined();
      },
    });
  });
  test('We should be able to login with if spaces are around the user name', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          body: {
            name: '  test2  ',
            password: 'password2'
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await loginUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response.success).toBeDefined();
      },
    });
  });
});
