import { enableFetchMocks } from 'jest-fetch-mock';
import MockDate from 'mockdate';
import { NextApiRequest } from 'next';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import { EmailDigestSettingTypes, EmailType } from '../../../../constants/emailDigest';
import TestId from '../../../../constants/testId';
import { logger } from '../../../../helpers/logger';
import { createNewRecordOnALevelYouBeatNotification } from '../../../../helpers/notificationHelper';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { EmailLogModel, NotificationModel, UserConfigModel, UserModel } from '../../../../models/mongoose';
import { EmailState } from '../../../../models/schemas/emailLogSchema';
import handler from '../../../../pages/api/internal-jobs/email-digest';

const sendMailMockNoError: jest.Mock = jest.fn(() => {
  return;
});
const ref = { mockPoint: sendMailMockNoError };

const defaultReq: NextApiRequest = {
  method: 'GET',
  query: {
    secret: process.env.INTERNAL_JOB_TOKEN_SECRET_EMAILDIGEST
  },
  headers: {
    'content-type': 'application/json',
  },
} as unknown as NextApiRequest;

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

describe('Email auto unsubscribe', () => {
  test('Simulate a bunch of days', async () => {
    // setup
    await dbConnect();
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'warn').mockImplementation(() => ({} as Logger));
    await UserConfigModel.findOneAndUpdate({ userId: TestId.USER }, { emailDigest: EmailDigestSettingTypes.DAILY }, { });
    ref.mockPoint = sendMailMockNoError;
    //jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'warn').mockImplementation(() => ({} as Logger));

    for (let i = 0; i < 14; i++) {
      await dbConnect();

      await testApiHandler({
        handler: async (_, res) => {
          await handler(defaultReq, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          const totalEmailsSent = await EmailLogModel.find({ userId: TestId.USER, emailState: EmailState.SENT });

          if (i <= 6) {
            expect(totalEmailsSent.length).toBe(i + 1);
            expect(response.error).toBeUndefined();
            expect(res.status).toBe(200);
            expect(response.emailUnsubscribeSent).toHaveLength(0);
            expect(response.emailDigestSent).toHaveLength(1); // TEST USER C has no UserConfig so we skip this user, and TEST USER B has no notifications in the last 24 hrs
            expect(response.emailDigestSent[0]).toBe('test@gmail.com');
            expect(response.emailReactivationSent).toHaveLength(0);
          }
          else if (i === 7) {
            expect(totalEmailsSent.length).toBe(i + 1);
            expect(response.error).toBeUndefined();
            expect(res.status).toBe(200);
            expect(response.emailUnsubscribeSent).toHaveLength(0);
            expect(response.emailReactivationSent).toHaveLength(1); // TEST USER C has no UserConfig so we skip this user, and TEST USER B has no notifications in the last 24 hrs
            expect(response.emailReactivationSent[0]).toBe('test@gmail.com');
          }
          else if (i > 7 && i < 10) {
            expect(totalEmailsSent.length).toBe(i + 1);
            expect(response.error).toBeUndefined();
            expect(res.status).toBe(200);
            expect(response.emailUnsubscribeSent).toHaveLength(0);
            expect(response.emailDigestSent).toHaveLength(1); // TEST USER C has no UserConfig so we skip this user, and TEST USER B has no notifications in the last 24 hrs
            expect(response.emailDigestSent[0]).toBe('test@gmail.com');
            expect(response.emailReactivationSent).toHaveLength(0);
          }
          else if (i === 10) {
            expect(totalEmailsSent.length).toBe(i + 1);
            expect(response.error).toBeUndefined();
            expect(res.status).toBe(200);
            expect(response.emailUnsubscribeSent).toHaveLength(1);
            expect(response.emailUnsubscribeSent[0]).toBe('test@gmail.com');
            expect(response.emailDigestSent).toHaveLength(0); // TEST USER C has no UserConfig so we skip this user, and TEST USER B has no notifications in the last 24 hrs
            expect(response.emailReactivationSent).toHaveLength(0);
          }
          else if (i > 10) {
            expect(totalEmailsSent.length).toBe(11);
            expect(response.error).toBeUndefined();
            expect(res.status).toBe(200);
            expect(response.emailUnsubscribeSent).toHaveLength(0);
            expect(response.emailDigestSent).toHaveLength(0);
            expect(response.emailReactivationSent).toHaveLength(0);
          }
        },
      });
      const tomorrow = Date.now() + (1000 * 60 * 60 * 24 ); // Note... Date.now() here is being mocked each time too!

      MockDate.set(tomorrow);
    }
  }, 10000);
});
