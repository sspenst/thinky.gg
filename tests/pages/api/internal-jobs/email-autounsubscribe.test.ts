import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import { NextApiRequestWrapper } from '@root/helpers/apiWrapper';
import { enableFetchMocks } from 'jest-fetch-mock';
import MockDate from 'mockdate';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import { EmailDigestSettingType } from '../../../../constants/emailDigest';
import TestId from '../../../../constants/testId';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { EmailLogModel, UserModel } from '../../../../models/mongoose';
import { EmailState } from '../../../../models/schemas/emailLogSchema';
import handler, { runEmailDigest } from '../../../../pages/api/internal-jobs/email-digest';

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

const defaultReq: NextApiRequestWrapper = {
  method: 'GET',
  gameId: DEFAULT_GAME_ID,
  query: {
    secret: process.env.INTERNAL_JOB_TOKEN_SECRET_EMAILDIGEST
  },
  headers: {
    'content-type': 'application/json',
  },
} as unknown as NextApiRequestWrapper;

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
    await Promise.all([
      UserModel.findOneAndUpdate({ _id: TestId.USER }, { emailConfirmed: false, emailDigest: EmailDigestSettingType.DAILY }).lean()
    ]);

    for (let day = 0; day < 13; day++) {
      const res = await runEmailDigest(DEFAULT_GAME_ID, 1000);
      const response = res.json;

      expect(res.status).toBe(200);
      expect(response.error).toBeUndefined();

      if (day === 6) {
        const totalEmailsSent = await EmailLogModel.find({ userId: TestId.USER, state: EmailState.SENT });

        expect(totalEmailsSent.length).toBe(day + 1);
        expect(response.emailUnsubscribeSent).toHaveLength(0);
        expect(response.emailDigestSent).toHaveLength(3);
        expect(response.emailDigestSent.sort()).toMatchObject(['bbb@gmail.com', 'test@gmail.com', 'the_curator@gmail.com'].sort());
        // sort response.emailDigestSent array alphabetically

        expect(response.emailReactivationSent).toHaveLength(0);
      } else if (day === 7) {
        const totalEmailsSent = await EmailLogModel.find({ userId: TestId.USER, state: EmailState.SENT });

        expect(totalEmailsSent.length).toBe(day + 1);
        expect(response.emailUnsubscribeSent).toHaveLength(0);
        expect(response.emailReactivationSent).toHaveLength(1);
        expect(response.emailReactivationSent[0]).toBe('test@gmail.com');
      } else if (day === 8 || day === 9) {
        const totalEmailsSent = await EmailLogModel.find({ userId: TestId.USER, state: EmailState.SENT });

        expect(totalEmailsSent.length).toBe(day + 1);
        expect(response.emailUnsubscribeSent).toHaveLength(0);
        expect(response.emailDigestSent.sort()).toMatchObject(['bbb@gmail.com', 'test@gmail.com', 'the_curator@gmail.com'].sort());
        expect(response.emailReactivationSent).toHaveLength(0);

        if (day === 9) {
          // mock an error in email sending...
          sendMailRefMock.ref = throwMock;
        }
      } else if (day === 10) {
        const totalEmailsSent = await EmailLogModel.find({ userId: TestId.USER, state: EmailState.SENT });

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
        expect(response.emailDigestFailed).toHaveLength(3); // because the unsubscribe failed - it'll try to send the digest again.. and the mock is still pointing to the failure
        expect(response.emailDigestFailed.sort()).toMatchObject(['bbb@gmail.com', 'test@gmail.com', 'the_curator@gmail.com'].sort());
        expect(response.emailReactivationSent).toHaveLength(0);
        sendMailRefMock.ref = acceptMock;
      } else if (day === 11) {
        const totalEmailsSent = await EmailLogModel.find({ userId: TestId.USER, state: EmailState.SENT });

        expect(totalEmailsSent.length).toBe(day); // -1 because we are not sending the email on day 10 due to mocked error
        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response.emailUnsubscribeFailed).toHaveLength(0);
        expect(response.emailUnsubscribeSent).toHaveLength(1);
        expect(response.emailUnsubscribeSent[0]).toBe('test@gmail.com');
        expect(response.emailDigestSent).toHaveLength(2);
        expect(response.emailDigestSent.sort()).toMatchObject(['bbb@gmail.com', 'the_curator@gmail.com'].sort());
        expect(response.emailReactivationSent).toHaveLength(0);
        // hopefully we tried again to send email
      } else if (day === 12) {
        const totalEmailsSent = await EmailLogModel.find({ userId: TestId.USER, state: EmailState.SENT });

        expect(totalEmailsSent.length).toBe(11);
        expect(response.emailUnsubscribeSent).toHaveLength(0);
        expect(response.emailDigestSent).toHaveLength(2);
        expect(response.emailReactivationSent).toHaveLength(0);
      }

      const tomorrow = Date.now() + (1000 * 60 * 60 * 24 ); // Note... Date.now() here is being mocked each time too!

      MockDate.set(tomorrow);
    }
  }, 10000);
});
