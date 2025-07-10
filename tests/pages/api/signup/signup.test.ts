import { DEFAULT_GAME_ID, GameId } from '@root/constants/GameId';
import { Games } from '@root/constants/Games';
import NotificationType from '@root/constants/notificationType';
import UserConfig from '@root/models/db/userConfig';
import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import TestId from '../../../../constants/testId';
// Import the mocked functions
import { initializeDisposableEmailDomains, isDisposableEmailDomain } from '../../../../helpers/disposableEmailDomains';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { KeyValueModel, UserConfigModel, UserModel } from '../../../../models/mongoose';
import loginUserHandler from '../../../../pages/api/login/index';
import signupUserHandler from '../../../../pages/api/signup/index';

// Mock the disposable domains module
jest.mock('../../../../helpers/disposableEmailDomains', () => ({
  initializeDisposableEmailDomains: jest.fn(),
  isDisposableEmailDomain: jest.fn(),
  getDisposableDomainsCount: jest.fn(),
  refreshDisposableEmailDomains: jest.fn(),
}));

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

  test('Creating a user but not passing recaptcha should fail with 400', async () => {
    process.env.RECAPTCHA_SECRET = 'defined';
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
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

        expect(response.error).toBe('Please fill out recaptcha');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Creating a user, pass recaptcha where fetch fails', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    process.env.RECAPTCHA_SECRET = 'defined';

    // mock fetch failing with 400
    fetchMock.mockResponseOnce(JSON.stringify({ 'mock': true }), { status: 408 });

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
            recaptchaToken: 'token',
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

        expect(response.error).toBe('Error validating recaptcha [Status: 408], [Data: {"mock":true}]');
        expect(res.status).toBe(400);
      },
    });
  });
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

  describe('Email domain validation', () => {
    afterEach(async () => {
      // Clean up disallowed domain entries after each test
      await KeyValueModel.deleteMany({ key: 'DISALLOWED_EMAIL_SIGNUP_DOMAIN' });
    });

    test('Creating a user with a disallowed email domain should fail', async () => {
      // Set up disallowed domain
      await KeyValueModel.create({
        gameId: GameId.THINKY,
        key: 'DISALLOWED_EMAIL_SIGNUP_DOMAIN',
        value: 'blocked.com tempmail.com'
      });

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: cookie,
            },
            body: {
              name: 'blocked_user',
              email: 'test@blocked.com',
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

          expect(response.error).toBe('Email address is not valid');
          expect(res.status).toBe(400);
        },
      });
    });

    test('Creating a user with a disallowed email domain (case insensitive) should fail', async () => {
      // Set up disallowed domain
      await KeyValueModel.create({
        gameId: GameId.THINKY,
        key: 'DISALLOWED_EMAIL_SIGNUP_DOMAIN',
        value: 'BLOCKED.COM'
      });

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: cookie,
            },
            body: {
              name: 'blocked_user2',
              email: 'test@blocked.com',
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

          expect(response.error).toBe('Email address is not valid');
          expect(res.status).toBe(400);
        },
      });
    });

    test('Creating a user with an allowed email domain should work', async () => {
      // Set up disallowed domain (but not the domain we're testing)
      await KeyValueModel.create({
        gameId: GameId.THINKY,
        key: 'DISALLOWED_EMAIL_SIGNUP_DOMAIN',
        value: 'blocked.com'
      });

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: cookie,
            },
            body: {
              name: 'allowed_user',
              email: 'test@allowed.com',
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

          expect(response.error).toBeUndefined();
          expect(response.success).toBe(true);
          expect(res.status).toBe(200);
        },
      });
    });

    test('Creating a user when no disallowed domains are configured should work', async () => {
      // No disallowed domains configured
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: cookie,
            },
            body: {
              name: 'no_restrictions_user',
              email: 'test@anydomain.com',
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

          expect(response.error).toBeUndefined();
          expect(response.success).toBe(true);
          expect(res.status).toBe(200);
        },
      });
    });

    test('Creating a guest user should not be affected by email domain restrictions', async () => {
      // Set up disallowed domain
      await KeyValueModel.create({
        gameId: GameId.THINKY,
        key: 'DISALLOWED_EMAIL_SIGNUP_DOMAIN',
        value: 'guest.com'
      });

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: cookie,
            },
            body: {
              guest: true,
              name: 'guest_user',
              email: 'test@guest.com',
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

          expect(response.error).toBeUndefined();
          expect(response.success).toBe(true);
          expect(res.status).toBe(200);
        },
      });
    });

    test('Creating a user with invalid email format should fail', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: cookie,
            },
            body: {
              name: 'invalid_email_user',
              email: 'invalid-email-format',
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

          expect(response.error).toBe('Email address is not valid');
          expect(res.status).toBe(400);
        },
      });
    });
  });

  describe('Disposable email domains', () => {
    beforeEach(() => {
      // Reset mocks
      (initializeDisposableEmailDomains as jest.Mock).mockReset();
      (isDisposableEmailDomain as jest.Mock).mockReset();
    });

    test('Creating a user with a disposable email domain should fail', async () => {
      // Mock disposable domain check to return true
      (initializeDisposableEmailDomains as jest.Mock).mockResolvedValue(undefined);
      (isDisposableEmailDomain as jest.Mock).mockReturnValue(true);

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: cookie,
            },
            body: {
              name: 'disposable_user',
              email: 'test@10minutemail.com',
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

          expect(response.error).toBe('Email address is not valid');
          expect(res.status).toBe(400);
          expect(initializeDisposableEmailDomains).toHaveBeenCalledTimes(1);
          expect(isDisposableEmailDomain).toHaveBeenCalledWith('10minutemail.com');
        },
      });
    });

    test('Creating a user with a non-disposable email domain should work', async () => {
      // Mock disposable domain check to return false
      (initializeDisposableEmailDomains as jest.Mock).mockResolvedValue(undefined);
      (isDisposableEmailDomain as jest.Mock).mockReturnValue(false);

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: cookie,
            },
            body: {
              name: 'regular_user',
              email: 'test@legitimate.com',
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

          expect(response.error).toBeUndefined();
          expect(response.success).toBe(true);
          expect(res.status).toBe(200);
          expect(initializeDisposableEmailDomains).toHaveBeenCalledTimes(1);
          expect(isDisposableEmailDomain).toHaveBeenCalledWith('legitimate.com');
        },
      });
    });

    test('Creating a user with disposable domain should fail even if admin restrictions are empty', async () => {
      // Mock disposable domain check to return true
      (initializeDisposableEmailDomains as jest.Mock).mockResolvedValue(undefined);
      (isDisposableEmailDomain as jest.Mock).mockReturnValue(true);

      // No admin restrictions configured
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: cookie,
            },
            body: {
              name: 'disposable_user2',
              email: 'test@tempmail.org',
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

          expect(response.error).toBe('Email address is not valid');
          expect(res.status).toBe(400);
          expect(initializeDisposableEmailDomains).toHaveBeenCalledTimes(1);
          expect(isDisposableEmailDomain).toHaveBeenCalledWith('tempmail.org');
        },
      });
    });

    test('Disposable domain check should be combined with admin restrictions', async () => {
      // Mock disposable domain check to return false (not disposable)
      (initializeDisposableEmailDomains as jest.Mock).mockResolvedValue(undefined);
      (isDisposableEmailDomain as jest.Mock).mockReturnValue(false);

      // Set up admin disallowed domain
      await KeyValueModel.create({
        gameId: GameId.THINKY,
        key: 'DISALLOWED_EMAIL_SIGNUP_DOMAIN',
        value: 'blocked.com'
      });

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: cookie,
            },
            body: {
              name: 'combined_test_user',
              email: 'test@blocked.com',
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

          expect(response.error).toBe('Email address is not valid');
          expect(res.status).toBe(400);
          expect(initializeDisposableEmailDomains).toHaveBeenCalledTimes(1);
          expect(isDisposableEmailDomain).toHaveBeenCalledWith('blocked.com');
        },
      });

      // Clean up
      await KeyValueModel.deleteMany({ key: 'DISALLOWED_EMAIL_SIGNUP_DOMAIN' });
    });

    test('Guest users should not be affected by disposable domain restrictions', async () => {
      // Mock disposable domain check to return true
      (initializeDisposableEmailDomains as jest.Mock).mockResolvedValue(undefined);
      (isDisposableEmailDomain as jest.Mock).mockReturnValue(true);

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: cookie,
            },
            body: {
              guest: true,
              name: 'guest_disposable_user',
              email: 'test@10minutemail.com',
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

          expect(response.error).toBeUndefined();
          expect(response.success).toBe(true);
          expect(res.status).toBe(200);
          // Should not even check disposable domains for guest users
          expect(initializeDisposableEmailDomains).not.toHaveBeenCalled();
          expect(isDisposableEmailDomain).not.toHaveBeenCalled();
        },
      });
    });
  });
});
