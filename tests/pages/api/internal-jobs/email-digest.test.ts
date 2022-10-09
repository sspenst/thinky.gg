import { enableFetchMocks } from 'jest-fetch-mock';
import { NextApiRequest } from 'next';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import { EmailDigestSettingTypes } from '../../../../constants/emailDigest';
import TestId from '../../../../constants/testId';
import { logger } from '../../../../helpers/logger';
import { createNewRecordOnALevelYouBeatNotification } from '../../../../helpers/notificationHelper';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { UserConfigModel } from '../../../../models/mongoose';
import handler from '../../../../pages/api/internal-jobs/email-digest';

const sendMailMock: jest.Mock = jest.fn(() => {
  throw new Error('Mock email error');
});
const sendMailMockNoError: jest.Mock = jest.fn(() => {
  return;
});
const ref = { mockPoint: sendMailMock };

afterEach(() => {
  jest.restoreAllMocks();
});
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockImplementation(() => ({
    sendMail: ref.mockPoint,
  })),
}));

afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();

describe('Email digest', () => {
  test('send with an invalid process.env var', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequest = {
          method: 'GET',
          query: {
            secret: 'abc'
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

        expect(res.status).toBe(401);
        expect(response.error).toBe('Unauthorized');
      },
    });
  });
  test('Run it when nodemailer throws error should fail gracefully', async () => {
    // setup
    await dbConnect();

    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'warn').mockImplementation(() => ({} as Logger));

    await createNewRecordOnALevelYouBeatNotification([TestId.USER], TestId.USER_B, TestId.LEVEL, 'blah');

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

        expect(response.error).toBe('Error sending email digest');
        expect(res.status).toBe(500);
      },
    });
  }, 10000);
  test('Run it once OK', async () => {
    // setup
    ref.mockPoint = sendMailMockNoError;
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'warn').mockImplementation(() => ({} as Logger));

    await dbConnect();

    await createNewRecordOnALevelYouBeatNotification([TestId.USER], TestId.USER_B, TestId.LEVEL, 'blah');
    await createNewRecordOnALevelYouBeatNotification([TestId.USER_C], TestId.USER, TestId.LEVEL_2, 'blah2');
    await createNewRecordOnALevelYouBeatNotification([TestId.USER_B], TestId.USER_C, TestId.LEVEL_3, 'blah2');

    await UserConfigModel.updateOne({ userId: TestId.USER_B }, { emailDigest: EmailDigestSettingTypes.NONE });

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
        expect(response.sent).toHaveLength(1); // TEST USER C has no UserConfig so we skip this user, and TEST USER B we set to have NO email digest turned on
        expect(response.sent[0]).toBe('test@gmail.com');
      },
    });
  }, 10000);
  test('Running it again right away should not send any (idempotency)', async () => {
    // setup

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
        expect(response.sent).toHaveLength(0);
      },
    });
  }, 10000);
});
