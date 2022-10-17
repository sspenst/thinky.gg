import { ObjectId } from 'bson';
import { convert } from 'html-to-text';
import { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
import SMTPPool from 'nodemailer/lib/smtp-pool';
import { EmailDigestSettingTypes, EmailType } from '../../../../constants/emailDigest';
import apiWrapper, { ValidType } from '../../../../helpers/apiWrapper';
import getEmailBody from '../../../../helpers/emails/getEmailBody';
import { logger } from '../../../../helpers/logger';
import dbConnect from '../../../../lib/dbConnect';
import isLocal from '../../../../lib/isLocal';
import User from '../../../../models/db/user';
import UserConfig from '../../../../models/db/userConfig';
import { EmailLogModel, LevelModel, NotificationModel, UserConfigModel, UserModel } from '../../../../models/mongoose';
import { EmailState } from '../../../../models/schemas/emailLogSchema';
import { getLevelOfDay } from '../../level-of-day';

export async function sendMail(batchId: ObjectId, type: EmailType, user: User, subject: string, body: string) {
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

  const textVersion = convert(body, {
    wordwrap: 130,
  });

  const mailOptions = {
    from: `Pathology <${pathologyEmail}>`,
    to: user.name + ' <' + user.email + '>',
    subject: subject,
    html: body,
    text: textVersion,
  };

  const emailLog = await EmailLogModel.create({
    batchId: batchId,
    userId: user._id,
    type: type,
    subject: subject,
    state: EmailState.PENDING,
  });
  let err = null;

  try {
    const sent: SMTPPool.SentMessageInfo = await transporter.sendMail(mailOptions);

    err = sent?.rejected.length > 0 ? 'rejected ' + sent.rejectedErrors : null;
  } catch (e) {
    logger.error('Failed to send email', { user: user._id, type: type, subject: subject, error: e });
    err = e;
  }

  await EmailLogModel.findByIdAndUpdate(emailLog._id, {
    state: err ? EmailState.FAILED : EmailState.SENT,
    error: err,
  });

  return err;
}

export async function sendEmailDigests(batchId: ObjectId, totalEmailedSoFar: string[] = []) {
  const levelOfDay = await getLevelOfDay();
  const userConfigs = await UserConfigModel.find({ emailDigest: {
    $in: [EmailDigestSettingTypes.DAILY, EmailDigestSettingTypes.ONLY_NOTIFICATIONS],
  } }).populate('userId', '_id name email').lean() as UserConfig[];
  const sentList = [];
  const failedList = [];

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

    if (totalEmailedSoFar.includes(user.email)) {
      logger.warn('Skipping user ' + user.name + ' because they have already received an email digest in this batch');
      continue;
    }

    logger.warn('Sending email to user ' + user.name + ' (' + user.email + ')');

    const todaysDatePretty = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const subject = userConfig.emailDigest === EmailDigestSettingTypes.DAILY ?
      `Daily Digest - ${todaysDatePretty}` :
      `You have ${notificationsCount} new notification${notificationsCount !== 1 ? 's' : ''}`;

    const title = `Welcome to the Pathology daily digest for ${todaysDatePretty}.`;
    const body = getEmailBody(levelOfDay, notificationsCount, title, user);
    const sentError = await sendMail(batchId, EmailType.EMAIL_DIGEST, user, subject, body);

    if (!sentError) {
      sentList.push(user.email);
    }
    else {
      failedList.push(user.email);
    }
  }

  return { sentList, failedList };
}

export async function sendEmailReactivation(batchId: ObjectId, totalEmailedSoFar: string[] = []) {
  // if they haven't been active in 7 days and they have an email address, send them an email, but only once every 90 days
  // get users that haven't been active in 7 days
  const levelOfDay = await getLevelOfDay();
  const usersThatHaveBeenSentReactivationInPast30d = await EmailLogModel.find({
    type: EmailType.EMAIL_7D_REACTIVATE,
    createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
  }).distinct('userId');

  const inactiveUsers = await UserModel.aggregate([
    {
      $match: {
        _id: { $nin: usersThatHaveBeenSentReactivationInPast30d },

        last_visited_at: { $lte: (Date.now() / 1000) - (7 * 24 * 60 * 60 ) }, // TODO need to refactor last_visited_at to be a DATE object instead of seconds

        email: { $ne: null },
      },
    },
    {
      $lookup: {
        from: 'userconfigs',
        localField: '_id',
        foreignField: 'userId',
        as: 'userConfig',
      },
    },
    {
      $unwind: {
        path: '$userConfig',
        preserveNullAndEmptyArrays: false, // if user has no config, don't include them
      },
    },
    {
      $match: {
        'userConfig.emailDigest': { $ne: EmailDigestSettingTypes.NONE },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        userConfig: 1,
        score: 1
      }
    }
  ]);

  const sentList: string[] = [];
  const failedList: string[] = [];
  const totalLevels = await LevelModel.countDocuments({
    isDraft: false,
  });
  const totalCreators = await LevelModel.distinct('userId').countDocuments();

  for (const user of inactiveUsers) {
    const totalLevelsSolved = user.score || 0;
    const toSolve = (totalLevels - totalLevelsSolved);
    const subject = 'New Pathology levels are waiting to be solved!';
    const title = 'We haven\'t seen you in a bit!';
    const message = `You've completed ${totalLevelsSolved.toLocaleString()} levels on New Pathology. There's ${toSolve.toLocaleString()} levels for you to play by ${totalCreators.toLocaleString()} different creators. Come back and play!`;
    const body = getEmailBody(levelOfDay, 0, title, user, message);

    if (totalEmailedSoFar.includes(user.email)) {
      logger.warn('Skipping user ' + user.name + ' because they have already received an email digest in this batch');
      continue;
    }

    const sentError = await sendMail(batchId, EmailType.EMAIL_7D_REACTIVATE, user, subject, body);

    if (!sentError) {
      sentList.push(user.email);
    }
    else {
      failedList.push(user.email);
    }
  }

  return { sentList, failedList };
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
  const batchId = new ObjectId(); // Creating a new batch ID for this email batch
  let emailDigestSent = [], emailDigestFailed = [];
  let emailReactivationSent = [], emailReactivationFailed = [];
  const totalEmailedSoFar: string[] = [];

  try {
    const emailReactivationResult = await sendEmailReactivation(batchId);

    totalEmailedSoFar.push(...emailReactivationResult.sentList);
    const emailDigestResult = await sendEmailDigests(batchId, totalEmailedSoFar);

    totalEmailedSoFar.push(...emailDigestResult.sentList);

    emailDigestSent = emailDigestResult.sentList;
    emailDigestFailed = emailDigestResult.failedList;
    emailReactivationSent = emailReactivationResult.sentList;
    emailReactivationFailed = emailReactivationResult.failedList;
    //emailReactivationSent = await sendEmailReactivation();
  } catch (err) {
    logger.error('Error sending email digest', err);

    return res.status(500).json({
      error: 'Error sending email digest',
    });
  }

  return res.status(200).json({ success: true, emailDigestSent: emailDigestSent, emailDigestFailed: emailDigestFailed, emailReactivationSent: emailReactivationSent, emailReactivationFailed: emailReactivationFailed });
});
