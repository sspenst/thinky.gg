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
      UserModel.findByIdAndUpdate(TestId.USER, { emailDigest: EmailDigestSettingType.DAILY }),
      UserModel.updateMany( {}, { last_visited_at: TimerUtil.getTs() })
    ]);

    for (let day = 0; day < 21; day++) {
      const res = await runEmailDigest(1000);
      const response = res.json;

      expect(res.status).toBe(200);
      expect(response.error).toBeUndefined();
      expect(response.sent[EmailType.EMAIL_DIGEST].sort()).toMatchObject(['admin@admin.com', 'bbb@gmail.com', 'test@gmail.com', 'the_curator@gmail.com'].sort());
      expect(response.sent[EmailType.EMAIL_7D_REACTIVATE]).toHaveLength(0);
      expect(response.sent[EmailType.EMAIL_10D_AUTO_UNSUBSCRIBE]).toHaveLength(0);

      const tomorrow = Date.now() + (1000 * 60 * 60 * 24 ); // Note... Date.now() here is being mocked each time too!

      MockDate.set(tomorrow);
    }
  }, 10000);
});
