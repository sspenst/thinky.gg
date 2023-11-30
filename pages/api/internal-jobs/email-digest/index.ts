import * as aws from '@aws-sdk/client-ses';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import Discord from '@root/constants/discord';
import { GameId } from '@root/constants/GameId';
import { Games } from '@root/constants/Games';
import NotificationType from '@root/constants/notificationType';
import Role from '@root/constants/role';
import queueDiscordWebhook from '@root/helpers/discordWebhook';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { convert } from 'html-to-text';
import { Types } from 'mongoose';
import { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
import SESTransport from 'nodemailer/lib/ses-transport';
import SMTPPool from 'nodemailer/lib/smtp-pool';
import { EmailDigestSettingTypes, EmailType } from '../../../../constants/emailDigest';
import apiWrapper, { ValidType } from '../../../../helpers/apiWrapper';
import getEmailBody from '../../../../helpers/getEmailBody';
import { logger } from '../../../../helpers/logger';
import dbConnect from '../../../../lib/dbConnect';
import isLocal from '../../../../lib/isLocal';
import User from '../../../../models/db/user';
import { EmailLogModel, LevelModel, NotificationModel, UserConfigModel, UserModel } from '../../../../models/mongoose';
import { EmailState } from '../../../../models/schemas/emailLogSchema';
import { getLevelOfDay } from '../../level-of-day';

const ses = new aws.SES({
  region: 'us-east-1',
  credentials: defaultProvider(),
});

const pathologyEmail = 'pathology.do.not.reply@pathology.gg';

const transporter = isLocal() ? nodemailer.createTransport({
  host: 'smtp.mailtrap.io',
  port: 2525,
  auth: {
    user: process.env.NODE_ENV !== 'test' ? process.env.MAILTRAP_USER : '',
    pass: process.env.NODE_ENV !== 'test' ? process.env.MAILTRAP_PASSWORD : '',
  },
  pool: true,
  maxConnections: 1,
  rateLimit: 3,
  rateDelta: 10000,
}) : nodemailer.createTransport({
  SES: { ses, aws },
  sendingRate: 20 // max 10 messages/second
});

export async function sendMail(gameId: GameId, batchId: Types.ObjectId, type: EmailType | NotificationType, user: User, subject: string, body: string) {
  /* istanbul ignore next */
  const textVersion = convert(body, {
    wordwrap: 130,
  });
  const game = Games[gameId];
  const mailOptions = {
    from: `${game.displayName} Puzzles <${pathologyEmail}>`,
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
    const sent: SMTPPool.SentMessageInfo | SESTransport.SentMessageInfo = await transporter.sendMail(mailOptions);

    err = sent?.rejected?.length > 0 ? 'rejected ' + sent.rejected : null;
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

export async function sendEmailDigests(gameId: GameId, batchId: Types.ObjectId, totalEmailedSoFar: string[], limit: number) {
  const game = Games[gameId];
  const userConfigsAggQ = UserConfigModel.aggregate([{
    $match: {
      emailDigest: {
        $in: [EmailDigestSettingTypes.DAILY],
      },
      gameId: gameId,
    },
  }, {
    $lookup: {
      from: UserModel.collection.name,
      localField: 'userId',
      foreignField: '_id',
      as: 'userId',
      pipeline: [
        {
          $project: {
            email: 1,
            name: 1,
            _id: 1,
            roles: 1,
          }
        }
      ]
    },
  }, {
    $unwind: '$userId',
  }, {
    $project: {
      userId: {
        _id: 1,
        email: 1,
        name: 1,
        roles: 1,
      },
      emailDigest: 1,
    },
  },
  {
    $match: {
      'userId.roles': {
        $ne: Role.GUEST,
      },
    },
  },
  // join notifications and count how many are unread, createdAt { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, and userId is the same as the user
  {
    $lookup: {
      from: NotificationModel.collection.name,
      let: { userId: '$userId._id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$userId', '$$userId'] },
                { $eq: ['$read', false] },
                { $gte: ['$createdAt', new Date(Date.now() - 24 * 60 * 60 * 1000)] },
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            notificationCount: '$count',
          },
        },
      ],
      as: 'notificationsCount',
    },
  },
  {
    $unwind: {
      path: '$notificationsCount',
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $set: {
      notificationsCount: {
        $ifNull: ['$notificationsCount.notificationCount', 0],
      },
    }
  },
  // join email logs and get the last one
  {
    $lookup: {
      from: EmailLogModel.collection.name,
      let: { userId: '$userId._id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$userId', '$$userId'] },
                { $eq: ['$type', EmailType.EMAIL_DIGEST] },
                { $ne: ['$state', EmailState.FAILED] },
              ],
            },
          },
        },
        { $sort: { createdAt: -1 } },
        { $limit: 1 },
      ],
      as: 'lastSentEmailLog',
    },
  },
  {
    $unwind: {
      path: '$lastSentEmailLog',
      preserveNullAndEmptyArrays: true,
    },
  },
  // filter out userConfig.emailDigest === EmailDigestSettingTypes.ONLY_NOTIFICATIONS && notificationsCount === 0
  {
    $match: {
      $or: [
        {
          $and: [
            { 'emailDigest': EmailDigestSettingTypes.DAILY },
          ],
        },
      ],
    },
  },
  ]);

  const [levelOfDay, userConfigs] = await Promise.all([
    getLevelOfDay(gameId),
    userConfigsAggQ
  ]);

  const sentList = [];
  const failedList = [];
  let count = 0;

  for (const userConfig of userConfigs) {
    if (!userConfig.userId) {
      continue;
    }

    const user = userConfig.userId as User;

    const [notificationsCount, lastSentEmailLog] = [userConfig.notificationsCount, userConfig.lastSentEmailLog];

    const lastSentTs = lastSentEmailLog ? new Date(lastSentEmailLog.createdAt) as unknown as Date : null;

    // check if last sent is within 23 hours
    // NB: giving an hour of leeway because the email may not be sent at the identical time every day
    if (lastSentTs && lastSentTs.getTime() > Date.now() - 23 * 60 * 60 * 1000) {
      continue;
    }

    if (totalEmailedSoFar.includes(user.email)) {
      continue;
    }

    const todaysDatePretty = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    /* istanbul ignore next */
    const subject = userConfig.emailDigest === EmailDigestSettingTypes.DAILY ?
      `Level of the Day - ${todaysDatePretty}` :
      `You have ${notificationsCount} new notification${notificationsCount !== 1 ? 's' : ''}`;

    const title = `Welcome to the ${game.displayName} Level of the Day for ${todaysDatePretty}.`;
    const body = getEmailBody(levelOfDay, notificationsCount, title, user);
    const sentError = await sendMail(gameId, batchId, EmailType.EMAIL_DIGEST, user, subject, body);

    if (!sentError) {
      sentList.push(user.email);
    } else {
      failedList.push(user.email);
    }

    count++;

    if (count >= limit) {
      break;
    }
  }

  return { sentList, failedList };
}

export async function sendAutoUnsubscribeUsers(gameId: GameId, batchId: Types.ObjectId, limit: number) {
  /**
   * here is the rules...
   * 1. If we sent a reactivation email to someone 3 days ago and they still haven't logged on, change their email notifications settings to NONE
   * 1a. Ignore folks that have had a reactivation email sent to them in past 3 days... we should give them a chance to come back and play
   */

  const levelOfDay = await getLevelOfDay(gameId);

  const usersThatHaveBeenSentReactivationEmailIn3dAgoOrMore = await EmailLogModel.find({
    state: EmailState.SENT,
    type: EmailType.EMAIL_7D_REACTIVATE,
    createdAt: { $lte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
  }).distinct('userId');
  const [totalLevels, totalCreatorsQuery, inactive7DUsersWhoWeHaveTriedToEmail] = await Promise.all([
    LevelModel.countDocuments({
      isDeleted: { $ne: true },
      isDraft: false,
      gameId: gameId
    }),
    LevelModel.distinct('userId'),
    UserModel.aggregate([
      {
        $match: {
          _id: { $in: usersThatHaveBeenSentReactivationEmailIn3dAgoOrMore },
          // checking if they have been not been active in past 10 days
          last_visited_at: { $lte: (Date.now() / 1000) - (10 * 24 * 60 * 60 ) }, // TODO need to refactor last_visited_at to be a DATE object instead of seconds
          roles: { $ne: Role.GUEST },
          email: { $ne: null },
        },
      },
      {
        $lookup: {
          from: UserConfigModel.collection.name,
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
          'userConfig.emailConfirmed': { $ne: true }, // don't unsubscribe users with verified emails
          'userConfig.emailDigest': { $ne: EmailDigestSettingTypes.NONE },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          userConfig: 1,
          last_visited_at: 1,
          score: 1
        }
      }
    ])

  ]);
  const totalCreators = totalCreatorsQuery.length;

  const sentList: string[] = [];
  const failedList: string[] = [];

  let count = 0;
  const game = Games[gameId];

  for (const user of inactive7DUsersWhoWeHaveTriedToEmail) {
    const totalLevelsSolved = user.score;
    const toSolve = (totalLevels - totalLevelsSolved);
    const subject = 'Auto unsubscribing you from our emails';
    const title = 'It has been some time since we have seen you login to ' + game.displayName + '! We are going to automatically change your email settings so that you will not hear from us again. You can always change your email settings back by visiting the account settings page.';
    const message = `You've completed ${totalLevelsSolved.toLocaleString()} levels on ${game.displayName}. There are still ${toSolve.toLocaleString()} levels for you to play by ${totalCreators.toLocaleString()} different creators. Come back and play!`;
    const body = getEmailBody(levelOfDay, 0, title, user, message);

    const sentError = await sendMail(gameId, batchId, EmailType.EMAIL_10D_AUTO_UNSUBSCRIBE, user, subject, body);

    if (!sentError) {
      await UserConfigModel.updateOne({ userId: user._id, gameId: gameId }, { emailDigest: EmailDigestSettingTypes.NONE });
      sentList.push(user.email);
    } else {
      failedList.push(user.email);
    }

    count++;

    if (count >= limit) {
      break;
    }
  }

  return { sentList, failedList };
}

export async function sendEmailReactivation(gameId: GameId, batchId: Types.ObjectId, limit: number) {
  // if they haven't been active in 7 days and they have an email address, send them an email, but only once every 90 days
  // get users that haven't been active in 7 days
  const levelOfDay = await getLevelOfDay(gameId);
  const usersThatHaveBeenSentReactivationInPast90d = await EmailLogModel.find({
    type: EmailType.EMAIL_7D_REACTIVATE,
    createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
    state: EmailState.SENT
  }).distinct('userId');
  const [totalLevels, totalCreatorsQuery, inactive7DUsers] = await Promise.all([
    LevelModel.countDocuments({
      isDeleted: { $ne: true },
      isDraft: false,
      gameId: gameId
    }),
    LevelModel.distinct('userId'),
    UserModel.aggregate([
      {
        $match: {
          _id: { $nin: usersThatHaveBeenSentReactivationInPast90d },
          // checking if they have been not been active in past 7 days
          last_visited_at: { $lte: (Date.now() / 1000) - (7 * 24 * 60 * 60 ) }, // TODO need to refactor last_visited_at to be a DATE object instead of seconds
          roles: { $ne: Role.GUEST },
          email: { $ne: null },
        },
      },
      {
        $lookup: {
          from: UserConfigModel.collection.name,
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
          last_visited_at: 1,
          score: 1
        }
      }
    ]
    )]);

  const sentList: string[] = [];
  const failedList: string[] = [];

  const totalCreators = totalCreatorsQuery.length;
  let count = 0;
  const game = Games[gameId];

  for (const user of inactive7DUsers) {
    const totalLevelsSolved = user.score;
    const toSolve = (totalLevels - totalLevelsSolved);
    const subject = 'New ' + game.displayName + ' levels are waiting to be solved!';
    const title = 'We haven\'t seen you in a bit!';
    const message = `You've completed ${totalLevelsSolved.toLocaleString()} levels on ${game.displayName}. There are still ${toSolve.toLocaleString()} levels for you to play by ${totalCreators.toLocaleString()} different creators. Come back and play!`;
    const body = getEmailBody(levelOfDay, 0, title, user, message);

    const sentError = await sendMail(gameId, batchId, EmailType.EMAIL_7D_REACTIVATE, user, subject, body);

    if (!sentError) {
      sentList.push(user.email);
    } else {
      failedList.push(user.email);
    }

    count++;

    if (count >= limit) {
      break;
    }
  }

  return { sentList, failedList };
}

export default apiWrapper({ GET: {
  query: {
    secret: ValidType('string', true),
    limit: ValidType('number', false, true)
  }
} }, async (req: NextApiRequest, res: NextApiResponse) => {
  const { secret, limit } = req.query;

  if (secret !== process.env.INTERNAL_JOB_TOKEN_SECRET_EMAILDIGEST) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const gameId = getGameIdFromReq(req);
  // default limit to 1000
  const limitNum = limit ? parseInt(limit as string) : 1000;

  await dbConnect();
  const batchId = new Types.ObjectId(); // Creating a new batch ID for this email batch

  let emailDigestSent = [], emailDigestFailed = [];
  let emailReactivationSent = [], emailReactivationFailed = [], emailUnsubscribeSent = [], emailUnsubscribeFailed = [];
  const totalEmailedSoFar: string[] = [];

  try {
    const [emailUnsubscribeResult, emailReactivationResult] = await Promise.all([
      sendAutoUnsubscribeUsers(gameId, batchId, limitNum),
      sendEmailReactivation(gameId, batchId, limitNum),
    ]);

    totalEmailedSoFar.push(...emailUnsubscribeResult.sentList);
    totalEmailedSoFar.push(...emailReactivationResult.sentList);

    const emailDigestResult = await sendEmailDigests(gameId, batchId, totalEmailedSoFar, limitNum);

    totalEmailedSoFar.push(...emailDigestResult.sentList);

    emailUnsubscribeSent = emailUnsubscribeResult.sentList.sort();
    emailUnsubscribeFailed = emailUnsubscribeResult.failedList.sort();
    emailDigestSent = emailDigestResult.sentList.sort();
    emailDigestFailed = emailDigestResult.failedList.sort();
    emailReactivationSent = emailReactivationResult.sentList.sort();
    emailReactivationFailed = emailReactivationResult.failedList.sort();
  } catch (err) {
    logger.error(err);

    return res.status(500).json({
      error: 'Error sending email digest',
    });
  }

  await queueDiscordWebhook(Discord.DevPriv, `📧 **Email Digest**\n\tSent: ${emailDigestSent.length}\n\tFailed: ${emailDigestFailed.length}\n🔄 **Reactivation**\n\tSent: ${emailReactivationSent.length}\n\tFailed: ${emailReactivationFailed.length}\n❌ **Unsubscribe**\n\tSent: ${emailUnsubscribeSent.length}\n\tFailed: ${emailUnsubscribeFailed.length}`);

  return res.status(200).json({ success: true, emailDigestSent: emailDigestSent, emailDigestFailed: emailDigestFailed, emailReactivationSent: emailReactivationSent, emailReactivationFailed: emailReactivationFailed, emailUnsubscribeSent: emailUnsubscribeSent, emailUnsubscribeFailed: emailUnsubscribeFailed });
});
