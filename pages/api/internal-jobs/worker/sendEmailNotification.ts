import getEmailBody from '@root/helpers/getEmailBody';
import getMobileNotification from '@root/helpers/getMobileNotification';
import Notification from '@root/models/db/notification';
import User from '@root/models/db/user';
import { EmailLogModel, UserModel } from '@root/models/mongoose';
import { Types } from 'mongoose';
import { sendMail } from '../email-digest';

/**
 * Send an email notification
 * NB: assumes the user's email notification settings have already been checked
 */
export async function sendEmailNotification(notification: Notification) {
  if (process.env.NODE_ENV === 'test') {
    return 'email notification not sent [test]';
  }

  const lastSent = await EmailLogModel.findOne({
    userId: notification.userId,
    type: notification.type,
  }).sort({ createdAt: -1 });

  const lastSentTime = lastSent ? new Date(lastSent.createdAt).getTime() : 0;
  const lastLoggedInTimeQuery = await UserModel.findOne({ _id: notification.userId }, { last_visited_at: 1 }).lean<User>();
  const lastLoggedInTime = lastLoggedInTimeQuery?.last_visited_at ? new Date(1000 * lastLoggedInTimeQuery.last_visited_at).getTime() : 0;

  // check if it has been less than 24 hours since last email
  if (Date.now() - lastSentTime < 1000 * 60 * 60 * 24) {
  // query last time we sent an email to this user. if they have not logged in since, do not send another email
    if (lastLoggedInTime < lastSentTime) {
      return 'email not sent [lastLoggedInTime < lastSentTime]';
    }
  }

  const mobileNotification = getMobileNotification(notification);
  const emailBody = getEmailBody({
    linkHref: mobileNotification.url,
    linkText: 'View',
    message: mobileNotification.body,
    title: mobileNotification.title,
    user: notification.userId,
  });

  await sendMail(notification.gameId, new Types.ObjectId(), notification.type, notification.userId, mobileNotification.title, emailBody);

  return 'email sent';
}
