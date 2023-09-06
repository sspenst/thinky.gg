import AchievementType from '@root/constants/achievements/achievementType';
import NotificationType from '@root/constants/notificationType';
import { createNewAchievement, createNewFollowerNotification, createNewReviewOnYourLevelNotification } from '@root/helpers/notificationHelper';
import { processQueueMessages } from '@root/pages/api/internal-jobs/worker';
import { enableFetchMocks } from 'jest-fetch-mock';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import { EmailDigestSettingTypes } from '../../../../constants/emailDigest';
import TestId from '../../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import UserConfig from '../../../../models/db/userConfig';
import { UserConfigModel } from '../../../../models/mongoose';
import handler from '../../../../pages/api/user-config/index';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async() => {
  await dbDisconnect();
});
afterEach(() => {
  jest.restoreAllMocks();
});
enableFetchMocks();
const defaultObj = {
  method: 'PUT',
  headers: {
    'content-type': 'application/json',
  },
  cookies: {
    token: getTokenCookieValue(TestId.USER)
  }
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

describe('account settings notification preferences', () => {
  const emailNotificationList = Object.values(NotificationType);
  const pushNotificationList = Object.values(NotificationType);

  // remove new follower notification from only emails
  emailNotificationList.splice(emailNotificationList.indexOf(NotificationType.NEW_FOLLOWER), 1);

  // enable all notifications
  test('enable all notifications except for new follower', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...defaultObj,
          body: {
            emailNotificationsList: emailNotificationList,
            pushNotificationsList: pushNotificationList,
            emailDigestSetting: EmailDigestSettingTypes.DAILY,
          }
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response.updated).toBe(true);

        // check the db
        const config = await UserConfigModel.findOne<UserConfig>({ userId: TestId.USER }, {}, { lean: true }) as UserConfig;

        expect(config.pushNotificationsList).toEqual(pushNotificationList);
        expect(config.emailNotificationsList).toEqual(emailNotificationList);
        // make sure it does not have new follower
        expect(config.emailNotificationsList).not.toContain(NotificationType.NEW_FOLLOWER);
        expect(config.pushNotificationsList).toContain(NotificationType.NEW_FOLLOWER);
      },
    });
  });
  test('create a new review on your level notification', async () => {
    // spy on sendMailRefMock.ref

    const originalSendEmail = jest.requireActual('@root/pages/api/internal-jobs/worker/sendEmailNotification');
    const originalSendPush = jest.requireActual('@root/pages/api/internal-jobs/worker/sendPushNotification');

    originalSendEmail.sendEmailNotification = jest.fn().mockImplementation(() => {
      // do nothing
    });
    originalSendPush.sendPushNotification = jest.fn().mockImplementation(() => {
      // do nothing
    });
    await createNewReviewOnYourLevelNotification(TestId.USER, TestId.USER_B, TestId.LEVEL, 'Sample review');

    const queueProcessed = await processQueueMessages();

    expect(queueProcessed).toBe('Processed 2 messages with no errors');
    expect(originalSendEmail.sendEmailNotification).toHaveBeenCalledTimes(1);
    expect(originalSendPush.sendPushNotification).toHaveBeenCalledTimes(1);
  });
  test('create a new follower notification', async () => {
    // spy on sendMailRefMock.ref

    const originalSendEmail = jest.requireActual('@root/pages/api/internal-jobs/worker/sendEmailNotification');
    const originalSendPush = jest.requireActual('@root/pages/api/internal-jobs/worker/sendPushNotification');

    originalSendEmail.sendEmailNotification = jest.fn().mockImplementation(() => {
      // do nothing
    });
    originalSendPush.sendPushNotification = jest.fn().mockImplementation(() => {
      // do nothing
    });
    await createNewFollowerNotification(TestId.USER_B, TestId.USER);

    const queueProcessed = await processQueueMessages();

    expect(queueProcessed).toBe('Processed 2 messages with no errors');
    expect(originalSendEmail.sendEmailNotification).toHaveBeenCalledTimes(0); // important
    expect(originalSendPush.sendPushNotification).toHaveBeenCalledTimes(1); // important!
  });
  test('create a new achievement notification', async () => {
    // spy on sendMailRefMock.ref

    const originalSendEmail = jest.requireActual('@root/pages/api/internal-jobs/worker/sendEmailNotification');
    const originalSendPush = jest.requireActual('@root/pages/api/internal-jobs/worker/sendPushNotification');

    originalSendEmail.sendEmailNotification = jest.fn().mockImplementation(() => {
      // do nothing
    });
    originalSendPush.sendPushNotification = jest.fn().mockImplementation(() => {
      // do nothing
    });
    await createNewAchievement(AchievementType.COMPLETED_LEVELS_100, new Types.ObjectId(TestId.USER_GUEST) );

    const queueProcessed = await processQueueMessages();

    expect(queueProcessed).toBe('Processed 2 messages with no errors');
    expect(originalSendEmail.sendEmailNotification).toHaveBeenCalledTimes(0); // important
    expect(originalSendPush.sendPushNotification).toHaveBeenCalledTimes(0); // important!
  });
});
