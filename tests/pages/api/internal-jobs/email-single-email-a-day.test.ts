import { enableFetchMocks } from 'jest-fetch-mock';
import MockDate from 'mockdate';
import { NextApiRequest } from 'next';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import { EmailDigestSettingTypes } from '../../../../constants/emailDigest';
import TestId from '../../../../constants/testId';
import { TimerUtil } from '../../../../helpers/getTs';
import { logger } from '../../../../helpers/logger';
import { createNewRecordOnALevelYouBeatNotifications } from '../../../../helpers/notificationHelper';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { EmailLogModel, UserConfigModel, UserModel } from '../../../../models/mongoose';
import { EmailState } from '../../../../models/schemas/emailLogSchema';
import handler from '../../../../pages/api/internal-jobs/email-digest';

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
const defaultReq: NextApiRequest = {
  method: 'GET',
  query: {
    secret: process.env.INTERNAL_JOB_TOKEN_SECRET_EMAILDIGEST
  },
  headers: {
    'content-type': 'application/json',
  },
} as unknown as NextApiRequest;

beforeAll(async () => {
  await dbConnect();
});
afterEach(() => {
  jest.restoreAllMocks();
});
beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();

describe('Email per day', () => {
  test('Simulate a bunch of days', async () => {
    // setup
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'warn').mockImplementation(() => ({} as Logger));
    await UserConfigModel.findOneAndUpdate({ userId: TestId.USER }, { emailDigest: EmailDigestSettingTypes.ONLY_NOTIFICATIONS }, { });

    for (let day = 0; day < 21; day++) {
      await testApiHandler({
        handler: async (_, res) => {
          await handler(defaultReq, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(res.status).toBe(200);
          expect(response.error).toBeUndefined();
          const totalEmailsSent = await EmailLogModel.find({ userId: TestId.USER, state: EmailState.SENT });

          if (day <= 6) {
            expect(totalEmailsSent.length).toBe(0); // No notifications
            expect(response.emailUnsubscribeSent).toHaveLength(0);
            expect(response.emailDigestSent).toHaveLength(1);
            expect(response.emailReactivationSent).toHaveLength(0);
          } else if (day === 7) {
            expect(totalEmailsSent.length).toBe(1); // +1 the reactivation?
            expect(response.emailUnsubscribeSent).toHaveLength(0);
            expect(response.emailReactivationSent).toHaveLength(1);
            expect(response.emailReactivationSent[0]).toBe('test@gmail.com');

            if (day === 7) {
              // create a notification on same day as their reactivation email... it should get skipped
              await createNewRecordOnALevelYouBeatNotifications([TestId.USER], TestId.USER_B, TestId.LEVEL, TestId.LEVEL);
            }
          } else if (day === 8) {
            expect(totalEmailsSent.length).toBe(2); // +1 the notification daily digest?
            expect(response.emailUnsubscribeSent).toHaveLength(0);
            expect(response.emailDigestSent).toHaveLength(2);
            expect(response.emailReactivationSent).toHaveLength(0);
            // Now let's make the user come back to the site!
            await UserModel.findByIdAndUpdate(TestId.USER, { last_visited_at: TimerUtil.getTs() });
          } else if (day > 8 && day < 18) {
            expect(totalEmailsSent.length).toBe(2);
            expect(response.emailUnsubscribeSent).toHaveLength(0);
            expect(response.emailDigestSent).toHaveLength(1);
            expect(response.emailReactivationSent).toHaveLength(0);
          } else if (day === 18) {
            expect(totalEmailsSent.length).toBe(3); // +1 the goodbye email too
            expect(response.emailUnsubscribeSent).toHaveLength(1);
            expect(response.emailDigestSent).toHaveLength(1);
            expect(response.emailReactivationSent).toHaveLength(0);
          } else if (day > 19) {
            expect(totalEmailsSent.length).toBe(3);
            expect(response.emailUnsubscribeSent).toHaveLength(0);
            expect(response.emailDigestSent).toHaveLength(1);
            expect(response.emailReactivationSent).toHaveLength(0);
          }
        },
      });
      const tomorrow = Date.now() + (1000 * 60 * 60 * 24 ); // Note... Date.now() here is being mocked each time too!

      MockDate.set(tomorrow);
    }
  }, 10000);
});
