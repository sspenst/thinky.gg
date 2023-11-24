import { GameId } from '@root/constants/GameId';
import { NextApiRequestGuest } from '@root/helpers/apiWrapper';
import { enableFetchMocks } from 'jest-fetch-mock';
import { NextApiRequest } from 'next';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import { EmailDigestSettingTypes, EmailType } from '../../../../constants/emailDigest';
import TestId from '../../../../constants/testId';
import { logger } from '../../../../helpers/logger';
import { createNewRecordOnALevelYouSolvedNotifications } from '../../../../helpers/notificationHelper';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { EmailLogModel, NotificationModel, UserConfigModel, UserModel } from '../../../../models/mongoose';
import { EmailState } from '../../../../models/schemas/emailLogSchema';
import handler from '../../../../pages/api/internal-jobs/email-digest';

const throwMock = () => {
  throw new Error('Mock email error');
};
const acceptMock = () => {
  return { rejected: [] };
};

const sendMailRefMock = { ref: acceptMock };

beforeAll(async () => {
  await dbConnect();
});

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockImplementation(() => ({
    sendMail: jest.fn().mockImplementation(() => {
      return sendMailRefMock.ref();
    }),
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
        const req: NextApiRequestGuest = {
          gameId: GameId.PATHOLOGY,
          method: 'GET',
          query: {
            secret: 'abc'
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

        expect(res.status).toBe(401);
        expect(response.error).toBe('Unauthorized');
      },
    });
  });
  test('Run it with limit 1 and when nodemailer throws error should fail gracefully', async () => {
    // setup
    await dbConnect();
    sendMailRefMock.ref = throwMock;
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'warn').mockImplementation(() => ({} as Logger));

    await createNewRecordOnALevelYouSolvedNotifications(GameId.PATHOLOGY, [TestId.USER], TestId.USER_B, TestId.LEVEL, 'blah');

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestGuest = {
          gameId: GameId.PATHOLOGY,
          method: 'GET',
          query: {
            secret: process.env.INTERNAL_JOB_TOKEN_SECRET_EMAILDIGEST,
            limit: '1'
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

        expect(response.emailDigestFailed).toHaveLength(1);

        expect(res.status).toBe(200);

        const emailLogs = await EmailLogModel.find({}, {}, { sort: { createdAt: -1 } });

        expect(emailLogs).toHaveLength(1);
        expect(emailLogs[0].state).toBe(EmailState.FAILED);
        expect(emailLogs[0].error).toBe('Error: Mock email error');
      },
    });
  }, 10000);
  test('Run it when nodemailer throws error should fail gracefully', async () => {
    // setup
    await dbConnect();
    sendMailRefMock.ref = throwMock;
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'warn').mockImplementation(() => ({} as Logger));

    await createNewRecordOnALevelYouSolvedNotifications(GameId.PATHOLOGY, [TestId.USER], TestId.USER_B, TestId.LEVEL, 'blah');

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestGuest = {
          gameId: GameId.PATHOLOGY,
          method: 'GET',
          query: {
            secret: process.env.INTERNAL_JOB_TOKEN_SECRET_EMAILDIGEST,
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

        expect(response.emailDigestFailed).toHaveLength(2);
        expect(response.emailDigestFailed[0]).toBe('bbb@gmail.com');
        expect(res.status).toBe(200);

        const emailLogs = await EmailLogModel.find({}, {}, { sort: { createdAt: -1 } });

        expect(emailLogs).toHaveLength(3);
        expect(emailLogs[0].state).toBe(EmailState.FAILED);
        expect(emailLogs[0].error).toBe('Error: Mock email error');
      },
    });
  }, 10000);
  test('User set email setting to never', async () => {
    // setup
    await UserConfigModel.findOneAndUpdate({ userId: TestId.USER }, { emailDigest: EmailDigestSettingTypes.NONE }, {});
    sendMailRefMock.ref = acceptMock;
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'warn').mockImplementation(() => ({} as Logger));

    await dbConnect();

    await Promise.all([createNewRecordOnALevelYouSolvedNotifications(GameId.PATHOLOGY, [TestId.USER], TestId.USER_B, TestId.LEVEL, 'blah'),
      createNewRecordOnALevelYouSolvedNotifications(GameId.PATHOLOGY, [TestId.USER_C], TestId.USER, TestId.LEVEL_2, 'blah2')]);

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestGuest = {
          gameId: GameId.PATHOLOGY,
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
        expect(response.emailDigestSent).toHaveLength(1);
        expect(response.emailDigestFailed).toHaveLength(0);
        expect(response.emailReactivationSent).toHaveLength(0);
        expect(response.emailReactivationFailed).toHaveLength(0);
      },
    });
  }, 10000);
  test('Run it once OK', async () => {
    // setup
    await UserConfigModel.findOneAndUpdate({ userId: TestId.USER }, { emailDigest: EmailDigestSettingTypes.DAILY }, {});
    sendMailRefMock.ref = acceptMock;
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'warn').mockImplementation(() => ({} as Logger));

    await dbConnect();

    await Promise.all([createNewRecordOnALevelYouSolvedNotifications(GameId.PATHOLOGY, [TestId.USER], TestId.USER_B, TestId.LEVEL, 'blah'),
      createNewRecordOnALevelYouSolvedNotifications(GameId.PATHOLOGY, [TestId.USER_C], TestId.USER, TestId.LEVEL_2, 'blah2')]);

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestGuest = {
          gameId: GameId.PATHOLOGY,
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
        expect(response.emailDigestSent).toHaveLength(1); // TEST USER C has no UserConfig so we skip this user, and TEST USER B has no notifications in the last 24 hrs
        expect(response.emailDigestSent[0]).toBe('test@gmail.com');
        expect(response.emailReactivationSent).toHaveLength(0);
      },
    });
  }, 10000);
  test('Run it again for another user who set settings to daily but has no notificaitons', async () => {
    // setup
    await Promise.all([UserConfigModel.findOneAndUpdate({ userId: TestId.USER }, { emailDigest: EmailDigestSettingTypes.DAILY }, {}),
      EmailLogModel.deleteMany({}),
      NotificationModel.deleteMany({})
    ]);
    sendMailRefMock.ref = acceptMock;
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'warn').mockImplementation(() => ({} as Logger));

    await dbConnect();

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestGuest = {
          gameId: GameId.PATHOLOGY,
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
        expect(response.emailDigestSent).toHaveLength(2); // TEST USER C has no UserConfig so we skip this user, and TEST USER B has no notifications in the last 24 hrs
        expect(response.emailDigestSent[0]).toBe('bbb@gmail.com');
        expect(response.emailDigestSent[1]).toBe('test@gmail.com');
        expect(response.emailReactivationSent).toHaveLength(0);
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
        const req: NextApiRequestGuest = {
          gameId: GameId.PATHOLOGY,
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
        expect(response.emailDigestSent).toHaveLength(0);
        expect(response.emailReactivationSent).toHaveLength(0);
      },
    });
  }, 10000);
  test('Running with a user with no userconfig', async () => {
    // delete user config
    await Promise.all([UserModel.findByIdAndDelete(TestId.USER),
      EmailLogModel.deleteMany({ type: EmailType.EMAIL_DIGEST, userId: TestId.USER }),
      createNewRecordOnALevelYouSolvedNotifications(GameId.PATHOLOGY, [TestId.USER], TestId.USER_B, TestId.LEVEL, 'blah')]);

    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'warn').mockImplementation(() => ({} as Logger));
    await dbConnect();

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestGuest = {
          gameId: GameId.PATHOLOGY,
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
        expect(response.emailDigestSent).toHaveLength(0);
        expect(response.emailDigestFailed).toHaveLength(0);
        expect(response.emailReactivationSent).toHaveLength(0);
        expect(response.emailReactivationFailed).toHaveLength(0);
        expect(res.status).toBe(200);
      },
    });
  }, 10000);
});
