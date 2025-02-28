import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import { NextApiRequestWrapper } from '@root/helpers/apiWrapper';
import { enableFetchMocks } from 'jest-fetch-mock';
import MockDate from 'mockdate';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import { EmailDigestSettingType, EmailType } from '../../../../constants/emailDigest';
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
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWrapper = {
          gameId: DEFAULT_GAME_ID,
          method: 'GET',
          query: {
            secret: 'abc'
          },
          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWrapper;

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

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWrapper = {
          gameId: DEFAULT_GAME_ID,
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
        } as unknown as NextApiRequestWrapper;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);

        const emailLogs = await EmailLogModel.find({}, {}, { sort: { createdAt: -1 } });

        expect(emailLogs).toHaveLength(1);
        expect(emailLogs[0].state).toBe(EmailState.FAILED);
        expect(emailLogs[0].error).toBe('Error: Mock email error');

        expect(response.failed[EmailType.EMAIL_DIGEST]).toHaveLength(1);
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

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWrapper = {
          gameId: DEFAULT_GAME_ID,
          method: 'GET',
          query: {
            secret: process.env.INTERNAL_JOB_TOKEN_SECRET_EMAILDIGEST,
          },
          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWrapper;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        // TestId.USER has a last_visited_at while the other two don't
        expect(response.failed[EmailType.EMAIL_DIGEST].sort()).toMatchObject(['admin@admin.com', 'bbb@gmail.com', 'test@gmail.com', 'the_curator@gmail.com'].sort());
        expect(response.failed[EmailType.EMAIL_7D_REACTIVATE].sort()).toMatchObject([].sort());
        expect(res.status).toBe(200);

        const emailLogs = await EmailLogModel.find({}, {}, { sort: { createdAt: -1 } });

        expect(emailLogs).toHaveLength(5);
        expect(emailLogs[0].state).toBe(EmailState.FAILED);
        expect(emailLogs[0].error).toBe('Error: Mock email error');
      },
    });
  }, 10000);
  test('User set email setting to never', async () => {
    // setup
    await UserModel.findOneAndUpdate({ _id: TestId.USER }, { emailDigest: EmailDigestSettingType.NONE }, {});
    sendMailRefMock.ref = acceptMock;
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'warn').mockImplementation(() => ({} as Logger));

    await dbConnect();

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWrapper = {
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
        } as unknown as NextApiRequestWrapper;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);

        expect(response.sent[EmailType.EMAIL_7D_REACTIVATE].sort()).toMatchObject([].sort());
        expect(response.sent[EmailType.EMAIL_DIGEST]).toHaveLength(3);
        expect(response.failed[EmailType.EMAIL_DIGEST]).toHaveLength(0);
        expect(response.failed[EmailType.EMAIL_7D_REACTIVATE]).toHaveLength(0);
      },
    });
  }, 10000);
  test('Run it once OK', async () => {
    // setup
    await UserModel.findOneAndUpdate({ _id: TestId.USER }, { emailDigest: EmailDigestSettingType.DAILY }, {});
    sendMailRefMock.ref = acceptMock;
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'warn').mockImplementation(() => ({} as Logger));

    await dbConnect();

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWrapper = {
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
        } as unknown as NextApiRequestWrapper;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response.sent[EmailType.EMAIL_DIGEST]).toHaveLength(1); // TEST USER C has no UserConfig so we skip this user, and TEST USER B has no notifications in the last 24 hrs
        expect(response.sent[EmailType.EMAIL_DIGEST][0]).toBe('test@gmail.com');
        expect(response.sent[EmailType.EMAIL_7D_REACTIVATE]).toHaveLength(0);
      },
    });
  }, 10000);
  test('Clear emails. Run it again for user who set settings to daily but has no notificaitons', async () => {
    // setup
    await Promise.all([UserConfigModel.findOneAndUpdate({ userId: TestId.USER }, { emailDigest: EmailDigestSettingType.DAILY }, {}),
      EmailLogModel.deleteMany({}),
      NotificationModel.deleteMany({})
    ]);
    sendMailRefMock.ref = acceptMock;
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'warn').mockImplementation(() => ({} as Logger));

    await dbConnect();

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWrapper = {
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
        } as unknown as NextApiRequestWrapper;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response.sent[EmailType.EMAIL_DIGEST].sort()).toMatchObject(['test@gmail.com', 'admin@admin.com', 'bbb@gmail.com', 'the_curator@gmail.com'].sort());
        expect(response.sent[EmailType.EMAIL_7D_REACTIVATE]).toHaveLength(0);
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
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWrapper = {
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
        } as unknown as NextApiRequestWrapper;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response.sent[EmailType.EMAIL_DIGEST]).toHaveLength(0);
        expect(response.sent[EmailType.EMAIL_7D_REACTIVATE]).toHaveLength(0);
      },
    });
  }, 10000);

  test('Run it with a user who has a streak', async () => {
    // setup
    await dbConnect();
    sendMailRefMock.ref = acceptMock;
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'warn').mockImplementation(() => ({} as Logger));

    const tomorrow = Date.now() + (1000 * 60 * 60 * 24 ); // Note... Date.now() here is being mocked each time too!

    MockDate.set(tomorrow);

    await Promise.all([
      UserModel.findByIdAndUpdate(TestId.USER, {
        ts: Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60) // Set registration date to 30 days ago so get by all the intro emails
      }),
      EmailLogModel.deleteMany({ type: EmailType.EMAIL_DIGEST, userId: TestId.USER }),
      UserConfigModel.findOneAndUpdate(
        { userId: TestId.USER },
        {
          calcCurrentStreak: 7,
          lastPlayedAt: new Date(),
          emailDigest: EmailDigestSettingType.DAILY
        },
        { upsert: true }
      )
    ]);

    // Update user config to have a streak

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWrapper = {
          gameId: DEFAULT_GAME_ID,
          method: 'GET',
          query: {
            secret: process.env.INTERNAL_JOB_TOKEN_SECRET_EMAILDIGEST
          },
          body: {},
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWrapper;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);

        // Check the email logs to verify the subject line includes the streak
        const emailLogs = await EmailLogModel.find({ userId: TestId.USER }, {}, { sort: { createdAt: -1 } });
        const latestEmail = emailLogs[0];

        expect(latestEmail).toBeDefined();
        expect(latestEmail.subject).toContain('Keep your streak of 7 days going!');
        expect(latestEmail.state).toBe(EmailState.SENT);

        expect(response.sent[EmailType.EMAIL_DIGEST]).toHaveLength(4);

        expect(response.failed[EmailType.EMAIL_DIGEST]).toHaveLength(0);
      },
    });
  }, 10000);

  test('Run it with a user who had a streak but it expired', async () => {
    // setup
    await dbConnect();
    sendMailRefMock.ref = acceptMock;
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'warn').mockImplementation(() => ({} as Logger));

    const tomorrow = Date.now() + (1000 * 60 * 60 * 24 ); // Note... Date.now() here is being mocked each time too!

    MockDate.set(tomorrow);

    await Promise.all([
      UserModel.findByIdAndUpdate(TestId.USER, {
        ts: Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60) // Set registration date to 30 days ago so get by all the intro emails
      }),
      EmailLogModel.deleteMany({ type: EmailType.EMAIL_DIGEST, userId: TestId.USER }),
      UserConfigModel.findOneAndUpdate(
        { userId: TestId.USER },
        {
          calcCurrentStreak: 7,
          lastPlayedAt: new Date().getTime() - 1000 * 60 * 60 * 24 * 7, // make the streak expired
          emailDigest: EmailDigestSettingType.DAILY
        },
        { upsert: true }
      )
    ]);

    // Update user config to have a streak

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWrapper = {
          gameId: DEFAULT_GAME_ID,
          method: 'GET',
          query: {
            secret: process.env.INTERNAL_JOB_TOKEN_SECRET_EMAILDIGEST
          },
          body: {},
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWrapper;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);

        // Check the email logs to verify the subject line includes the streak
        const emailLogs = await EmailLogModel.find({ userId: TestId.USER }, {}, { sort: { createdAt: -1 } });
        const latestEmail = emailLogs[0];

        expect(latestEmail).toBeDefined();
        expect(latestEmail.subject).not.toContain('Keep your streak of 7 days going!');
        expect(latestEmail.state).toBe(EmailState.SENT);

        expect(response.sent[EmailType.EMAIL_DIGEST]).toHaveLength(4);

        expect(response.failed[EmailType.EMAIL_DIGEST]).toHaveLength(0);
      },
    });

    // Clean up - reset the streak
    await UserConfigModel.findOneAndUpdate(
      { userId: TestId.USER },
      {
        calcCurrentStreak: 0,
        lastPlayedAt: null
      }
    );
  }, 10000);
  test('Running with a user with no userconfig', async () => {
    // delete user config
    await Promise.all([UserModel.findByIdAndDelete(TestId.USER),
      EmailLogModel.deleteMany({ type: EmailType.EMAIL_DIGEST, userId: TestId.USER }),
      createNewRecordOnALevelYouSolvedNotifications(DEFAULT_GAME_ID, [TestId.USER], TestId.USER_B, TestId.LEVEL, 'blah')]);

    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'warn').mockImplementation(() => ({} as Logger));
    await dbConnect();

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWrapper = {
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
        } as unknown as NextApiRequestWrapper;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.sent[EmailType.EMAIL_DIGEST]).toHaveLength(0);
        expect(response.failed[EmailType.EMAIL_DIGEST]).toHaveLength(0);
        expect(response.sent[EmailType.EMAIL_7D_REACTIVATE]).toHaveLength(0);
        expect(response.sent[EmailType.EMAIL_7D_REACTIVATE]).toHaveLength(0);
        expect(res.status).toBe(200);
      },
    });
  }, 10000);
});
