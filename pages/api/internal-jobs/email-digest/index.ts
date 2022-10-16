import { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
import SMTPPool from 'nodemailer/lib/smtp-pool';
import { EmailDigestSettingTypes, EmailType } from '../../../../constants/emailDigest';
import apiWrapper, { ValidType } from '../../../../helpers/apiWrapper';
import { getEmailDigestTemplate } from '../../../../helpers/emails/email-digest';
import { logger } from '../../../../helpers/logger';
import dbConnect from '../../../../lib/dbConnect';
import isLocal from '../../../../lib/isLocal';
import User from '../../../../models/db/user';
import UserConfig from '../../../../models/db/userConfig';
import { EmailLogModel, NotificationModel, UserConfigModel, UserModel } from '../../../../models/mongoose';
import { EmailState } from '../../../../models/schemas/emailLogSchema';
import { getLevelOfDay } from '../../level-of-day';

export async function sendMail(type: EmailType, user: User, subject: string, body: string, textVersion: string) {
  const pathologyEmail = 'pathology.do.not.reply@gmail.com';

  let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: pathologyEmail,
      pass: process.env.EMAIL_PASSWORD,
    },
    pool: true,
    maxConnections: 1,
    rateLimit: 5,
  });

  if (isLocal()) {
    transporter = nodemailer.createTransport({
      host: 'smtp.mailtrap.io',
      port: 2525,
      auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASSWORD
      },
      pool: true,
      maxConnections: 1,
      rateLimit: 5,
    });
  }

  const mailOptions = {
    from: `Pathology <${pathologyEmail}>`,
    to: user.name + ' <' + user.email + '>',
    subject: subject,
    html: body,
    text: textVersion
  };

  const emailLog = await EmailLogModel.create({
    userId: user._id,
    type: type,
    subject: subject,
    state: EmailState.PENDING,
  });
  let err = null;

  try {
    const sent: SMTPPool.SentMessageInfo = await transporter.sendMail(mailOptions);

    err = sent?.rejected.length > 0 ? 'rejected' + sent.rejectedErrors : null;
    emailLog.state = EmailState.SENT;
    emailLog.save();
  } catch (e) {
    logger.error('Failed to send email', { user: user._id, type: type, subject: subject });
    err = e;
  }

  if (err) {
    emailLog.state = EmailState.FAILED;
    emailLog.save();
    throw err;
  }
}

export async function sendEmailDigests() {
  const levelOfDay = await getLevelOfDay();
  const userConfigs = await UserConfigModel.find({ emailDigest: {
    $in: [EmailDigestSettingTypes.DAILY, EmailDigestSettingTypes.ONLY_NOTIFICATIONS],
  } }).populate('userId', '_id name email').lean() as UserConfig[];
  const sentList = [];

  for (const userConfig of userConfigs) {
    if (!userConfig.userId) {
      logger.warn('No user exists for userConfig with id ' + userConfig._id);
      continue;
    }

    const notificationsCount = await NotificationModel.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      read: false,
      userId: userConfig.userId._id,
    });
    const user = userConfig.userId as User;

    if (userConfig.emailDigest === EmailDigestSettingTypes.ONLY_NOTIFICATIONS && notificationsCount === 0) {
      logger.warn('Skipping user ' + user.name + ' because they have emailDigest set to ONLY_NOTIFICATIONS and have 0 unread notifications');
      continue;
    }

    const lastSentEmailLog = await EmailLogModel.findOne({ user: user._id, type: EmailType.EMAIL_DIGEST, state: { $ne: EmailState.FAILED } }, {}, { sort: { createdAt: -1 } });
    const lastSentTs = lastSentEmailLog ? new Date(lastSentEmailLog.createdAt) as unknown as Date : new Date(0);

    // check if last sent is within 23 hours
    // NB: giving an hour of leeway because the email may not be sent at the identical time every day
    if (lastSentTs && lastSentTs.getTime() > Date.now() - 23 * 60 * 60 * 1000) {
      logger.warn('Skipping user ' + user.name + ' because they have already received an email digest in the past 24 hours');
      continue;
    }

    logger.warn('Sending email to user ' + user.name + ' (' + user.email + ')');

    const todaysDatePretty = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const subject = userConfig.emailDigest === EmailDigestSettingTypes.DAILY ?
      `Daily Digest - ${todaysDatePretty}` :
      `You have ${notificationsCount} new notification${notificationsCount !== 1 ? 's' : ''}`;
      /* istanbul ignore next */
    const { body, textVersion } = getEmailDigestTemplate(user, notificationsCount, levelOfDay);

    // can test the output here:
    // https://htmlemail.io/inline/
    // console.log(body);

    await sendMail(EmailType.EMAIL_DIGEST, user, subject, body, textVersion);

    sentList.push(user.email);
  }

  return sentList;
}

export async function sendEmailReactivation() {
  // if they haven't been active in 7 days and they have an email address, send them an email, but only once every 30 days
  // get users that haven't been active in 7 days
  const inactiveUsers = await UserModel.find({
    lastActive: {
      $lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    },
    email: {
      $ne: null,
    },
  }, '_id email name last_visited_at', {
    lean: true,
  });

  const now = Date.now();
  const sentList = [];

  for (const user of inactiveUsers) {
    //
  }
}

export default apiWrapper({ GET: {
  query: {
    secret: ValidType('string', true)
  }
} }, async (req: NextApiRequest, res: NextApiResponse) => {
  const { secret } = req.query;

  if (secret !== process.env.INTERNAL_JOB_TOKEN_SECRET_EMAILDIGEST) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await dbConnect();
  let emailDigestSent = [];
  let emailReactivationSent = [];

  try {
    emailDigestSent = await sendEmailDigests();
    emailReactivationSent = [];
    //emailReactivationSent = await sendEmailReactivation();
  } catch (err) {
    logger.error('Error sending email digest', err);

    return res.status(500).json({
      error: 'Error sending email digest',
    });
  }

  return res.status(200).json({ success: true, emailDigestSent: emailDigestSent, emailReactivationSent: emailReactivationSent });
});
