import { enableFetchMocks } from 'jest-fetch-mock';
import MockDate from 'mockdate';
import { NextApiRequest } from 'next';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import { EmailDigestSettingTypes } from '../../../../constants/emailDigest';
import TestId from '../../../../constants/testId';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { EmailLogModel, UserConfigModel } from '../../../../models/mongoose';
import { EmailState } from '../../../../models/schemas/emailLogSchema';
import handler from '../../../../pages/api/internal-jobs/email-digest';

const throwMock = () => {
  throw new Error('Throwing error as no email should be sent');
};
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

describe('Email auto unsubscribe', () => {
  test('Simulate a bunch of days', async () => {
    // setup
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'warn').mockImplementation(() => ({} as Logger));
    await UserConfigModel.findOneAndUpdate({ userId: TestId.USER }, { emailDigest: EmailDigestSettingTypes.DAILY }, { });

    for (let day = 0; day < 12; day++) {
      await dbConnect();
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
            expect(totalEmailsSent.length).toBe(day + 1);
            expect(response.emailUnsubscribeSent).toHaveLength(0);
            expect(response.emailDigestSent).toHaveLength(2);
            expect(response.emailDigestSent[0]).toBe('test@gmail.com');
            expect(response.emailReactivationSent).toHaveLength(0);
          }
          else if (day === 7) {
            expect(totalEmailsSent.length).toBe(day + 1);
            expect(response.emailUnsubscribeSent).toHaveLength(0);
            expect(response.emailReactivationSent).toHaveLength(1);
            expect(response.emailReactivationSent[0]).toBe('test@gmail.com');
          }
          else if (day > 7 && day < 10) {
            expect(totalEmailsSent.length).toBe(day + 1);
            expect(response.emailUnsubscribeSent).toHaveLength(0);
            expect(response.emailDigestSent).toHaveLength(2);
            expect(response.emailDigestSent[0]).toBe('test@gmail.com');
            expect(response.emailReactivationSent).toHaveLength(0);

            if (day === 9) {
              // mock an error in email sending...
              sendMailRefMock.ref = throwMock;
            }
          }
          else if (day === 10) {
            const [totalEmailsPending, totalEmailsFailed] = await Promise.all([EmailLogModel.find({ userId: TestId.USER, state: EmailState.PENDING })
              , EmailLogModel.find({ userId: TestId.USER, state: EmailState.FAILED })]);

            expect(totalEmailsSent.length).toBe(day );
            expect(response.error).toBeUndefined();
            expect(res.status).toBe(200);
            expect(response.emailUnsubscribeSent).toHaveLength(0);
            expect(response.emailUnsubscribeFailed).toHaveLength(1);
            expect(response.emailUnsubscribeFailed[0]).toBe('test@gmail.com');
            expect(totalEmailsFailed.length).toBe(2);
            expect(totalEmailsPending.length).toBe(0);
            expect(response.emailDigestSent).toHaveLength(0);
            expect(response.emailDigestFailed).toHaveLength(2); // because the unsubscribe failed - it'll try to send the digest again.. and the mock is still pointing to the failure
            expect(response.emailReactivationSent).toHaveLength(0);
            sendMailRefMock.ref = acceptMock;
          }
          else if (day === 11) {
            expect(totalEmailsSent.length).toBe(day); // -1 because we are not sending the email on day 10 due to mocked error
            expect(response.error).toBeUndefined();
            expect(res.status).toBe(200);
            expect(response.emailUnsubscribeFailed).toHaveLength(0);
            expect(response.emailUnsubscribeSent).toHaveLength(1);
            expect(response.emailUnsubscribeSent[0]).toBe('test@gmail.com');
            expect(response.emailDigestSent).toHaveLength(1);
            expect(response.emailReactivationSent).toHaveLength(0);
            // hopefully we tried again to send email
          }
          else if (day > 11) {
            expect(totalEmailsSent.length).toBe(11);
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
