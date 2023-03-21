import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import { SentMessageInfo } from 'nodemailer';
import { Logger } from 'winston';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import forgotPasswordHandler from '../../../../pages/api/forgot-password/index';

// let sendMailMock: jest.Mock = jest.fn((obj: SentMessageInfo) => {
//   throw new Error('Email was not expected to be sent, but received' + obj);
// });

beforeAll(async () => {
  await dbConnect();
});

// afterEach(() => {
//   jest.clearAllMocks();
// });

afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();

describe('Forgot a password API should function right', () => {
  test('Sending forgot a password with wrong HTTP method should fail', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',

          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await forgotPasswordHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Method not allowed');
        expect(res.status).toBe(405);
      },
    });
  });
  test('Sending forgot a password request without parameters should fail', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          body: {
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await forgotPasswordHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Invalid body.email');
        expect(res.status).toBe(400);
      },
    });
  });

  test('Sending forgot a password with an invalid email should fail', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          body: {
            email: 'test@tregargfest.com'
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await forgotPasswordHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Could not find an account with this email');
        expect(res.status).toBe(404);
      },
    });
  });
  test('Sending forgot a password request with correct parameters should succeed', async () => {
    jest.mock('nodemailer', () => ({
      createTransport: jest.fn().mockImplementation(() => ({
        sendMail: jest.fn((obj: SentMessageInfo) => {
          expect(obj.to).toBe('test <test@gmail.com>');
          expect(obj.from).toBe('Pathology <pathology.do.not.reply@gmail.com>');
          expect(obj.subject).toBe('Password Reset - test');

          expect(obj.text).toMatch(/Click here to reset your password: http:\/\/localhost:3000\/reset-password\/600000000000000000000000\/[A-Za-z0-9.\-_]{10,}$/);

          return { rejected: [] };
        }),
      })),
    }));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          body: {
            email: 'test@gmail.com'
          },
          headers: {
            'content-type': 'application/json',
            'origin': 'http://localhost:3000',
          },
        } as unknown as NextApiRequestWithAuth;

        await forgotPasswordHandler(req, res);
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
  test('Sending forgot a password request when sendMail returns null should fail gracefully', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    jest.mock('nodemailer', () => ({
      createTransport: jest.fn().mockImplementation(() => ({
        sendMail: jest.fn(() => {
          return null;
        }),
      })),
    }));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          body: {
            email: 'test@gmail.com'
          },
          headers: {
            'content-type': 'application/json',
            'origin': 'http://localhost:3000',
          },
        } as unknown as NextApiRequestWithAuth;

        await forgotPasswordHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(500);
      },
    });
  });
  test('Sending forgot a password request when sendMail throws an error should fail gracefully', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    jest.mock('nodemailer', () => ({
      createTransport: jest.fn().mockImplementation(() => ({
        sendMail: jest.fn(() => {
          throw new Error('Some example exception in sendMail');
        }),
      })),
    }));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          body: {
            email: 'test@gmail.com'
          },
          headers: {
            'content-type': 'application/json',
            'origin': 'http://localhost:3000',
          },
        } as unknown as NextApiRequestWithAuth;

        await forgotPasswordHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Could not send password reset email');
        expect(res.status).toBe(500);
      },
    });
  });
});
