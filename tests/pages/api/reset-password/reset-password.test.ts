import { enableFetchMocks } from 'jest-fetch-mock';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import { SentMessageInfo } from 'nodemailer';
import { Logger } from 'winston';
import TestId from '../../../../constants/testId';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import getResetPasswordToken from '../../../../lib/getResetPasswordToken';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { UserModel } from '../../../../models/mongoose';
import resetPasswordHandler from '../../../../pages/api/reset-password/index';

const sendMailMock: jest.Mock = jest.fn((obj: SentMessageInfo) => {
  throw new Error('Email was not expected to be sent, but received' + obj);
});

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockImplementation(() => ({
    sendMail: sendMailMock,
  })),
}));
afterEach(() => {
  jest.restoreAllMocks();
});
afterAll(async () => {
  await dbDisconnect();
});
beforeAll(async () => {
  await dbConnect();
});
enableFetchMocks();

describe('Reset a password API should function right', () => {
  jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

  test('Sending wrong HTTP method should fail', async () => {
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

        await resetPasswordHandler(req, res);
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
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await resetPasswordHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Bad request');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Sending forgot a password request with partial parameters should fail', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          body: {
            email: 'blah@blah.com'
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await resetPasswordHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Invalid body.password, body.token, body.userId');
        expect(res.status).toBe(400);
      },
    });
  });

  test('Sending forgot a password with an malformed token should fail', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          body: {
            password: 'pass',
            userId: TestId.USER,
            token: 'blah'
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await resetPasswordHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Invalid token');
        expect(res.status).toBe(401);
      },
    });
  });
  test('Sending forgot a password with an invalid user should fail', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    const userB = await UserModel.findById(TestId.USER_B);

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          body: {
            password: 'pass',
            userId: new Types.ObjectId(),
            token: getResetPasswordToken(userB)
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await resetPasswordHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Error finding User');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Sending forgot a password with a valid token for ANOTHER user token should fail', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    const userB = await UserModel.findById(TestId.USER_B);

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          body: {
            password: 'pass',
            userId: TestId.USER,
            token: getResetPasswordToken(userB)
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await resetPasswordHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Invalid token');
        expect(res.status).toBe(401);
      },
    });
  });
  test('Sending forgot a password with a valid token for my user token should work', async () => {
    const userB = await UserModel.findById(TestId.USER_B, '_id ts password');

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          body: {
            password: 'NEWPASS123',
            userId: TestId.USER_B,
            token: getResetPasswordToken(userB)
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await resetPasswordHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response.success).toBe(true);
      },
    });
  });
  test('If my user does not have a timestamp, it should error with malformed token', async () => {
    const newUserId = new Types.ObjectId();
    const newUserObj = await UserModel.create({
      _id: newUserId,
      calc_records: 0,
      email: 'bab@gmail.com',
      name: 'BLAH',
      password: 'BAAAB123',
      score: 0,
      ts: null,
    });

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          body: {
            password: 'NEWPASS',
            userId: newUserId,
            token: getResetPasswordToken(newUserObj)
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await resetPasswordHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Malformed token');
        expect(res.status).toBe(401);
      },
    });
  });
});
