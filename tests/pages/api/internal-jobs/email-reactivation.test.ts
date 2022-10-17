import { enableFetchMocks } from 'jest-fetch-mock';
import { NextApiRequest } from 'next';
import { testApiHandler } from 'next-test-api-route-handler';
import { SentMessageInfo } from 'nodemailer';
import { Logger } from 'winston';
import TestId from '../../../../constants/testId';
import { TimerUtil } from '../../../../helpers/getTs';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { UserModel } from '../../../../models/mongoose';
import handler from '../../../../pages/api/internal-jobs/email-digest';

let sendMailMock: jest.Mock = jest.fn((obj: SentMessageInfo) => {
  throw new Error('Email was not expected to be sent, but received' + obj);
});

afterEach(() => {
  jest.restoreAllMocks();
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
enableFetchMocks();

describe('Email reactivation', () => {
  test('Run it once OK', async () => {
    // setup
    sendMailMock = jest.fn((obj: SentMessageInfo) => {
      expect(obj.to).toContain('test@gmail.com');
      expect(obj.from).toContain('pathology.do.not.reply@gmail.com');
      expect(obj.subject).toContain('New Pathology levels are waiting to be solved!');

      return { rejected: [] };
    });
    // jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'warn').mockImplementation(() => ({} as Logger));

    await dbConnect();

    await UserModel.findByIdAndUpdate(TestId.USER, {
      // make user last active 8 days ago
      last_visited_at: TimerUtil.getTs() - (8 * 24 * 60 * 60),
    });

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequest = {
          method: 'GET',
          query: {
            secret: process.env.INTERNAL_JOB_TOKEN_SECRET_EMAILDIGEST
          },
          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequest;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response.emailDigestFailed).toHaveLength(0);
        expect(response.emailReactivationFailed).toHaveLength(0);
        expect(response.emailDigestSent).toHaveLength(0);
        expect(response.emailReactivationSent).toHaveLength(1);
        expect(response.emailReactivationSent[0]).toBe('test@gmail.com');
      },
    });
  }, 10000);
  test('Running it again right away should not send any since it has been less than 30 days (idempotency)', async () => {
    // setup
    sendMailMock = jest.fn((obj: SentMessageInfo) => {
      throw Error('Email was not expected to be sent, but received' + obj);
    });
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'warn').mockImplementation(() => ({} as Logger));
    await dbConnect();

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequest = {
          method: 'GET',
          query: {
            secret: process.env.INTERNAL_JOB_TOKEN_SECRET_EMAILDIGEST
          },
          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequest;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response.emailDigestSent).toHaveLength(0);
        expect(response.emailReactivationSent).toHaveLength(0);
      },
    });
  }, 10000);
});
