import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import { NextApiRequestGuest } from '@root/helpers/apiWrapper';
import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import { EmailType } from '../../../../constants/emailDigest';
import TestId from '../../../../constants/testId';
import { TimerUtil } from '../../../../helpers/getTs';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { EmailLogModel, UserModel } from '../../../../models/mongoose';
import { EmailState } from '../../../../models/schemas/emailLogSchema';
import handler from '../../../../pages/api/internal-jobs/email-digest';

const throwMock = () => {
  throw new Error('Throwing error as no email should be sent');
};
const acceptMock = () => {
  return { rejected: [] };
};
const rejectMock = () => {
  return { rejected: ['Test rejection'], rejectedErrors: ['Test rejection error'] };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sendMailRefMock: any = { ref: acceptMock };

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockImplementation(() => ({
    sendMail: jest.fn().mockImplementation(() => {
      return sendMailRefMock.ref();
    }),
  })),
}));

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

describe('Email reactivation', () => {
  test('Run it when nodemailer throws error should fail gracefully', async () => {
    // setup
    await dbConnect();
    sendMailRefMock.ref = rejectMock;
    await UserModel.findByIdAndUpdate(TestId.USER, {
      // make user last active 8 days ago
      last_visited_at: TimerUtil.getTs() - (8 * 24 * 60 * 60),
    });
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'warn').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestGuest = {
          gameId: DEFAULT_GAME_ID,
          method: 'GET',
          query: {
            secret: process.env.INTERNAL_JOB_TOKEN_SECRET_EMAILDIGEST
          },
          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestGuest;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();
        const emailLogs = await EmailLogModel.find({}, {}, { sort: { createdAt: -1 } });

        expect(emailLogs).toHaveLength(3);
        expect(emailLogs[2].state).toBe(EmailState.FAILED);
        expect(emailLogs[2].error).toBe('rejected Test rejection');
        expect(emailLogs[2].type).toBe(EmailType.EMAIL_7D_REACTIVATE);
        expect(response.emailReactivationFailed).toHaveLength(1);
        expect(response.emailReactivationFailed[0]).toBe('test@gmail.com');
        expect(res.status).toBe(200);
      },
    });
  }, 10000),
  test('Run it once OK', async () => {
    // setup
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'warn').mockImplementation(() => ({} as Logger));

    await dbConnect();
    // clear out the attempted email log from the previous test...

    await EmailLogModel.deleteMany({ type: EmailType.EMAIL_7D_REACTIVATE, state: EmailState.FAILED, userId: TestId.USER });
    sendMailRefMock.ref = acceptMock;
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestGuest = {
          gameId: DEFAULT_GAME_ID,
          method: 'GET',
          query: {
            secret: process.env.INTERNAL_JOB_TOKEN_SECRET_EMAILDIGEST
          },
          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestGuest;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();
        const emailLogs = await EmailLogModel.find({}, {}, { sort: { createdAt: -1 } });

        expect(emailLogs).toHaveLength(4);
        expect(emailLogs[1].state).toBe(EmailState.SENT);
        expect(emailLogs[1].error).toBeNull();
        expect(emailLogs[1].type).toBe(EmailType.EMAIL_7D_REACTIVATE);
        expect(response.emailReactivationSent).toHaveLength(1);
        expect(response.emailReactivationSent[0]).toBe('test@gmail.com');
        expect(res.status).toBe(200);
      },
    });
  }, 10000);
  test('Running it again right away should not send any since it has been less than 90 days (idempotency)', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'warn').mockImplementation(() => ({} as Logger));
    await dbConnect();

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestGuest = {
          gameId: DEFAULT_GAME_ID,
          method: 'GET',
          query: {
            secret: process.env.INTERNAL_JOB_TOKEN_SECRET_EMAILDIGEST
          },
          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestGuest;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response.emailDigestFailed).toHaveLength(0);
        expect(response.emailDigestSent).toHaveLength(1);
        expect(response.emailReactivationSent).toHaveLength(0);
      },
    });
  }, 10000);
  test('Running it again but cause a mongo exception in querying', async () => {
    // setup
    jest.spyOn(UserModel, 'aggregate').mockImplementation(() => {
      throw new Error('Test mongo error');
    });
    sendMailRefMock.ref = throwMock;
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'warn').mockImplementation(() => ({} as Logger));
    await dbConnect();

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestGuest = {
          gameId: DEFAULT_GAME_ID,
          method: 'GET',
          query: {
            secret: process.env.INTERNAL_JOB_TOKEN_SECRET_EMAILDIGEST
          },
          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestGuest;

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
});
