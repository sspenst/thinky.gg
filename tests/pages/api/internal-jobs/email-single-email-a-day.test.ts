import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import { enableFetchMocks } from 'jest-fetch-mock';
import MockDate from 'mockdate';
import { Logger } from 'winston';
import { EmailDigestSettingType, EmailType } from '../../../../constants/emailDigest';
import TestId from '../../../../constants/testId';
import { TimerUtil } from '../../../../helpers/getTs';
import { logger } from '../../../../helpers/logger';
import { createNewRecordOnALevelYouSolvedNotifications } from '../../../../helpers/notificationHelper';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { EmailLogModel, UserModel } from '../../../../models/mongoose';
import { EmailState } from '../../../../models/schemas/emailLogSchema';
import { runEmailDigest } from '../../../../pages/api/internal-jobs/email-digest';

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
    await Promise.all([
      UserModel.findByIdAndUpdate(TestId.USER, { emailConfirmed: false, emailDigest: EmailDigestSettingType.DAILY }),
      UserModel.updateMany( {}, { last_visited_at: TimerUtil.getTs() })
    ]);

    for (let day = 0; day < 21; day++) {
      const res = await runEmailDigest(1000);
      const response = res.json;

      expect(res.status).toBe(200);
      expect(response.error).toBeUndefined();

      if (day === 6) {
        expect(response.sent[EmailType.EMAIL_10D_AUTO_UNSUBSCRIBE]).toHaveLength(0);
        expect(response.sent[EmailType.EMAIL_DIGEST].sort()).toMatchObject(['bbb@gmail.com', 'test@gmail.com', 'the_curator@gmail.com'].sort());
        expect(response.sent[EmailType.EMAIL_7D_REACTIVATE]).toHaveLength(0);
      } else if (day === 7) {
        expect(response.sent[EmailType.EMAIL_DIGEST]).toHaveLength(0); // all three were sent a reactivation email
        expect(response.sent[EmailType.EMAIL_7D_REACTIVATE]).toHaveLength(3);
        expect(response.sent[EmailType.EMAIL_7D_REACTIVATE].sort()).toMatchObject(['bbb@gmail.com', 'test@gmail.com', 'the_curator@gmail.com'].sort());
        expect(response.sent[EmailType.EMAIL_10D_AUTO_UNSUBSCRIBE]).toHaveLength(0);

        await createNewRecordOnALevelYouSolvedNotifications(DEFAULT_GAME_ID, [TestId.USER], TestId.USER_B, TestId.LEVEL, TestId.LEVEL);
      } else if (day === 8 || day === 9) {
        expect(response.sent[EmailType.EMAIL_10D_AUTO_UNSUBSCRIBE]).toHaveLength(0);
        expect(response.sent[EmailType.EMAIL_7D_REACTIVATE]).toHaveLength(0);
        // We are continuing to send email digests between the reactivation and the auto unsubscribe
        expect(response.sent[EmailType.EMAIL_DIGEST].sort()).toMatchObject(['bbb@gmail.com', 'test@gmail.com', 'the_curator@gmail.com'].sort());

        // Now let's make the user come back to the site! (As if they got reactivated)
        if (day === 9) {
          await UserModel.findByIdAndUpdate(TestId.USER, { last_visited_at: TimerUtil.getTs() });
        }
      } else if (day === 10) {
        const totalEmailsSent = await EmailLogModel.countDocuments({ userId: TestId.USER, state: EmailState.SENT }).lean();

        expect(totalEmailsSent).toBe(day + 1);
        expect(response.sent[EmailType.EMAIL_10D_AUTO_UNSUBSCRIBE]).toHaveLength(2);
        expect(response.sent[EmailType.EMAIL_7D_REACTIVATE]).toHaveLength(0);
        expect(response.sent[EmailType.EMAIL_10D_AUTO_UNSUBSCRIBE].sort()).toMatchObject(['bbb@gmail.com', 'the_curator@gmail.com'].sort());
      } else if (day >= 11 && day <= 15) {
        expect(response.sent[EmailType.EMAIL_10D_AUTO_UNSUBSCRIBE]).toHaveLength(0);
        expect(response.sent[EmailType.EMAIL_7D_REACTIVATE]).toHaveLength(0);
        expect(response.sent[EmailType.EMAIL_DIGEST].sort()).toMatchObject(['test@gmail.com'].sort());
      } else if (day === 16) {
        // Now it has been 7 days again since USER was active
        expect(response.sent[EmailType.EMAIL_10D_AUTO_UNSUBSCRIBE]).toHaveLength(0);
        expect(response.sent[EmailType.EMAIL_7D_REACTIVATE].sort()).toMatchObject(['test@gmail.com'].sort());
        expect(response.sent[EmailType.EMAIL_DIGEST]).toHaveLength(0);
      } else if (day === 17) {
        // Now it has been 7 days again since USER was active
        expect(response.sent[EmailType.EMAIL_10D_AUTO_UNSUBSCRIBE]).toHaveLength(0);
        expect(response.sent[EmailType.EMAIL_DIGEST].sort()).toMatchObject(['test@gmail.com'].sort());
        expect(response.sent[EmailType.EMAIL_7D_REACTIVATE]).toHaveLength(0);
      } else if (day === 21) {
        const totalEmailsSent = await EmailLogModel.countDocuments({ userId: TestId.USER, state: EmailState.SENT }).lean();

        expect(totalEmailsSent).toBe(day + 1);
        expect(response.sent[EmailType.EMAIL_7D_REACTIVATE]).toHaveLength(0);
        expect(response.sent[EmailType.EMAIL_10D_AUTO_UNSUBSCRIBE].sort()).toMatchObject(['test@gmail.com'].sort());
        expect(response.sent[EmailType.EMAIL_DIGEST]).toHaveLength(0);
      }

      const tomorrow = Date.now() + (1000 * 60 * 60 * 24 ); // Note... Date.now() here is being mocked each time too!

      MockDate.set(tomorrow);
    }
  }, 10000);
});
