import { EmailType } from '@root/constants/emailDigest';
import getEmailBody from '@root/helpers/emails/getEmailBody';
import getMobileNotification from '@root/helpers/getMobileNotification';
import Notification from '@root/models/db/notification';
import { EmailLogModel, UserConfigModel, UserModel } from '@root/models/mongoose';
import { Types } from 'mongoose';
import { sendMail } from '../email-digest';

export async function sendEmail(notification: Notification) {
  const userConfig = await UserConfigModel.findOne({ userId: notification.userId }, { emailNotificationsList: 1 }, { lean: true });
  const validTypes = userConfig?.emailNotificationsList || [];

  if (validTypes.includes(notification.type)) {
    const lastSent = await EmailLogModel.findOne({
      userId: notification.userId,
      type: notification.type,
    }).sort({ createdAt: -1 });

    const lastSentTime = lastSent ? new Date(lastSent.createdAt).getTime() : 0;
    const lastLoggedInTimeQuery = await UserModel.findOne({ _id: notification.userId }, { last_visited_at: 1 }, { lean: true });
    const lastLoggedInTime = lastLoggedInTimeQuery?.last_visited_at ? new Date(1000 * lastLoggedInTimeQuery.last_visited_at).getTime() : 0;

    // check if it has been less than 24 hours since last email
    if (Date.now() - lastSentTime < 1000 * 60 * 60 * 24) {
    // query last time we sent an email to this user. if they have not logged in since, do not send another email
      if (lastLoggedInTime < lastSentTime) {
        return 'email not sent [lastLoggedInTime < lastSentTime]';
      }
    }

    const mobileNotification = getMobileNotification(notification);
    const emailBody = getEmailBody(null, 0, mobileNotification.title, notification.userId, mobileNotification.body, mobileNotification.url, 'View');

    await sendMail(new Types.ObjectId(), EmailType.EMAIL_WALL_POST, notification.userId, mobileNotification.title, emailBody);

    return 'email sent';
  }

  return 'email not sent (not enabled from user config)';
}
