import * as aws from '@aws-sdk/client-ses';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import DiscordChannel from '@root/constants/discordChannel';
import { GameId } from '@root/constants/GameId';
import { Games } from '@root/constants/Games';
import NotificationType from '@root/constants/notificationType';
import Role from '@root/constants/role';
import queueDiscordWebhook from '@root/helpers/discordWebhook';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import EmailLog from '@root/models/db/emailLog';
import { EnrichedLevel } from '@root/models/db/level';
import { convert } from 'html-to-text';
import { Types } from 'mongoose';
import { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
import SESTransport from 'nodemailer/lib/ses-transport';
import SMTPPool from 'nodemailer/lib/smtp-pool';
import { EmailDigestSettingType, EmailType } from '../../../../constants/emailDigest';
import apiWrapper, { ValidType } from '../../../../helpers/apiWrapper';
import getEmailBody from '../../../../helpers/getEmailBody';
import { logger } from '../../../../helpers/logger';
import dbConnect from '../../../../lib/dbConnect';
import isLocal from '../../../../lib/isLocal';
import User from '../../../../models/db/user';
import { EmailLogModel, NotificationModel, UserModel } from '../../../../models/mongoose';
import { EmailState } from '../../../../models/schemas/emailLogSchema';
import { getLevelOfDay } from '../../level-of-day';

const ses = new aws.SES({
  region: 'us-east-1',
  credentials: defaultProvider(),
});

const thinkyEmail = 'do.not.reply@thinky.gg';

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
  const mailOptions = {
    from: `Thinky Puzzle Games <${thinkyEmail}>`,
    to: user.name + ' <' + user.email + '>',
    subject: subject,
    html: body,
    text: textVersion,
  };

  const emailLog = await EmailLogModel.create({
    batchId: batchId,
    gameId: gameId,
    state: EmailState.PENDING,
    subject: subject,
    type: type,
    userId: user._id,
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

interface UserWithNotificationsCount extends User {
  notificationsCount: number;
  lastSentEmailLogs: EmailLog[];
}

export async function sendEmailDigests(batchId: Types.ObjectId, limit: number) {
  const userAgg = UserModel.aggregate<UserWithNotificationsCount>([
    {
      $match: {
        emailDigest: { $ne: EmailDigestSettingType.NONE },
        roles: {
          $ne: Role.GUEST,
        },
        // check where ts exists
        ts: { $exists: true },
      },
    },
    {
      $project: {
        _id: 1,
        email: 1,
        name: 1,
        roles: 1,
        emailDigest: 1,
        ts: 1,
        last_visited_at: 1
      }
    },
    {
      $lookup: {
        from: NotificationModel.collection.name,
        let: { userId: '$_id' },
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
        let: { userId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$userId', '$$userId'] },
                  // get where type is either EmailType.EMAIL_DIGEST or EmailType.EMAIL_7D_REACTIVATE or EmailType.EMAIL_10D_AUTO_UNSUBSCRIBE
                  { $in: ['$type', [EmailType.EMAIL_DIGEST, EmailType.EMAIL_7D_REACTIVATE, EmailType.EMAIL_10D_AUTO_UNSUBSCRIBE]] },
                  { $ne: ['$state', EmailState.FAILED] },
                  // match where created at is greater than 1 week ago
                  { $gte: ['$createdAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
                ],
              },
            },
          },
          {
            $project: {
              _id: 1,
              type: 1,
              createdAt: 1,
            },
          },
          { $sort: { createdAt: -1 } },
        ],
        as: 'lastSentEmailLogs',
      },
    },
  ]);

  const levelsOfDay = await getlevelsOfDay();

  //const levelsOfDayMappedByGameId = Object.fromEntries(Object.values(Games).map((game, i) => [game.id, levelsOfDay[i]]));

  const users = await userAgg;

  //  return { sentListByEmailDigestType: {}, failedListByEmailDigestType: {} };

  const sentListByEmailDigestType = {
    [EmailType.EMAIL_DIGEST]: [],
    [EmailType.EMAIL_7D_REACTIVATE]: [],
    [EmailType.EMAIL_10D_AUTO_UNSUBSCRIBE]: [],
  } as { [key: string]: string[] };
  const failedListByEmailDigestType = {
    [EmailType.EMAIL_DIGEST]: [],
    [EmailType.EMAIL_7D_REACTIVATE]: [],
    [EmailType.EMAIL_10D_AUTO_UNSUBSCRIBE]: [],
  } as { [key: string]: string[] };

  let count = 0;

  for (const user of users) {
    const [lastVisitedAt, notificationsCount] = [user.last_visited_at || 0, user.notificationsCount];

    const lastSentEmailLogsGroupedByType = {
      [EmailType.EMAIL_DIGEST]: [],
      [EmailType.EMAIL_7D_REACTIVATE]: [],
      [EmailType.EMAIL_10D_AUTO_UNSUBSCRIBE]: [],
    } as { [key: string]: EmailLog[] };

    let lastSentEmailLogTs = null;

    for (const emailLog of user.lastSentEmailLogs) {
      lastSentEmailLogsGroupedByType[emailLog.type].push(emailLog);

      if (!lastSentEmailLogTs || emailLog.createdAt > lastSentEmailLogTs) {
        lastSentEmailLogTs = emailLog.createdAt;
      }
    }

    // check if last sent is within 23 hours
    // NB: giving an hour of leeway because the email may not be sent at the identical time every day
    if (lastSentEmailLogTs && lastSentEmailLogTs.getTime() > Date.now() - 23 * 60 * 60 * 1000) {
      continue;
    }

    let emailTypeToSend = EmailType.EMAIL_DIGEST;

    // Check if they have been inactive for 7 days

    const REACTIVATION_ENABLED = false;

    if (REACTIVATION_ENABLED) {
      const isInactive = lastVisitedAt <= (Date.now() / 1000) - (7 * 24 * 60 * 60 );

      if (isInactive) {
        if (lastSentEmailLogsGroupedByType[EmailType.EMAIL_7D_REACTIVATE].length > 0) {
        // This means we've sent them a reactivation email in the past 7 days

          if (lastVisitedAt <= (Date.now() / 1000) - (10 * 24 * 60 * 60 )) {
            emailTypeToSend = EmailType.EMAIL_10D_AUTO_UNSUBSCRIBE;
          }
        } else {
          emailTypeToSend = EmailType.EMAIL_7D_REACTIVATE;
        }
      }
    }

    const todaysDatePretty = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const lastGamePlayed = user.lastGame;
    const game = getGameFromId(lastGamePlayed);
    const NewUserCampaign = [
      {
        subject: '🧩 Your Thinky Solving Journey Begins Today! 🧩',
        title: 'Welcome to Thinky.gg! 🦉',
        message: 'Welcome to Thinky.gg! We\'re excited to have you join us on this journey of puzzle solving. We have a ton of levels for you to solve and we can\'t wait to see how you do!',
        linkText: `Visit ${game.displayName}`,
        linkHref: `${game.baseUrl}`,
      },
      {
        // We want to encourage them on the second day to check out the other features of the site
        // for example, you can play real time multiplayer with other players, you can also play levels created by other users
        subject: 'There is a lot more to Thinky.gg than just the campaign',
        title: 'Yesterday was just the beginning! Today, see what else Thinky.gg has to offer',
        message: 'Have you tried reviewing a level? Or checking out other level collections? There are also dozens of 🏆 achievements 🏆 to earn in Thinky.gg. Can you earn them all? Check out your achievements page to see how you stack up against other players!',
        linkText: 'Your Achievements',
        linkHref: `${game.baseUrl}/achievements`,
      },
      {
        // On the third day, we want to encourage them to create their own levels.
        title: 'How creative are you? 🎨',
        subject: 'Create your OWN levels on Thinky.gg',
        message: 'Every single level on Thinky.gg was built by a community member. Did you know you can create your own levels with our robust level editor and share them with the world?',
        linkText: 'Create a Pathology level',
        linkHref: `${game.baseUrl}/create`,
      },
      {
        subject: '🦉 Have you tried real time multiplayer?',
        title: 'Challenge your friends in real time multiplayer!',
        message: 'See how your ELO rating stacks up in the real-time multiplayer mode!',
        linkText: 'Try Multiplayer',
        linkHref: `${game.baseUrl}/multiplayer`,
      },
      {
        subject: 'Check out our mobile apps',
        title: 'Check out our mobile apps',
        message: 'Did you know we have an iOS and Android app? Download Thinky on the App Store and Google Play Store to play on the go!',
        linkText: 'Thinky on iOS', // @TODO make two CTAs for iOS and Android
        linkHref: 'https://apps.apple.com/app/pathology-block-pushing-game/id1668925562',
      },
    ];

    // count how many days the user has been registered
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const daysRegistered = Math.floor((Date.now() / 1000 - (user as any).ts) / (24 * 60 * 60));

    let NewUserEmail = {} as { subject: string, title: string, message: string, linkText: string, linkHref: string };

    if (daysRegistered < NewUserCampaign.length) {
      NewUserEmail = NewUserCampaign[daysRegistered];
    }

    /* istanbul ignore next */
    const EmailTextTable: { [key: string]: { title: string, message?: string, subject: string, featuredLevelsLabel: string } } = {
      [EmailType.EMAIL_DIGEST]: {
        title: `Welcome to your Thinky.gg daily digest for ${todaysDatePretty}.`,
        subject: 'Levels of the Day - ' + todaysDatePretty,
        featuredLevelsLabel: 'Levels of the Day',
      },
      [EmailType.EMAIL_7D_REACTIVATE]: {
        subject: 'We miss you - Come check out what\'s new',
        title: 'We haven\'t seen you in a bit!',
        message: 'We noticed that you haven\'t come back to Thinky.gg in a bit. There has been a ton of new levels added to the site ready to challenge your brain. Come check them out!',
        featuredLevelsLabel: 'Levels of the Day',
      },
      [EmailType.EMAIL_10D_AUTO_UNSUBSCRIBE]: {
        subject: 'Auto unsubscribing you from our emails',
        title: 'Auto unsubscribing you from our emails',
        message: 'We are automatically changing your email settings so that you will not receive email digests from us. You can always change your email settings back by visiting the account settings page.',
        featuredLevelsLabel: 'Levels of the Day',
      },
    };

    const msgObj = {
      ...EmailTextTable[emailTypeToSend],
      ...NewUserEmail
    };

    const title = msgObj.title;

    const body = getEmailBody({
      featuredLevels: levelsOfDay as EnrichedLevel[],
      featuredLevelsLabel: msgObj.featuredLevelsLabel,
      gameId: GameId.THINKY,
      linkHref: msgObj.linkHref,
      linkText: msgObj.linkText,
      message: msgObj.message,
      notificationsCount: notificationsCount,
      title: title,
      user: user,
    });

    const sentError = await sendMail(GameId.THINKY, batchId, emailTypeToSend, user, msgObj.subject, body);

    if (!sentError) {
      if (emailTypeToSend === EmailType.EMAIL_10D_AUTO_UNSUBSCRIBE) {
        // time to unsubscribe them
        await UserModel.updateOne({ _id: user._id }, { emailDigest: EmailDigestSettingType.NONE });
      }

      sentListByEmailDigestType[emailTypeToSend].push(user.email);
    } else {
      failedListByEmailDigestType[emailTypeToSend].push(user.email);
    }

    count++;

    if (count >= limit) {
      break;
    }
  }

  return { sentListByEmailDigestType, failedListByEmailDigestType };
}

export async function getlevelsOfDay() {
  const promises = [];

  for (const game of Object.values(Games)) {
    if (!game.isNotAGame) {
      promises.push(getLevelOfDay(game.id));
    }
  }

  const levelsOfDay = await Promise.all(promises);

  // filter out nulls
  return levelsOfDay.filter((level) => level);
}

export async function runEmailDigest(limitNum: number) {
  await dbConnect();
  const batchId = new Types.ObjectId(); // Creating a new batch ID for this email batch

  let emailDigestResult;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resTrack = { status: 500, json: { error: 'Error sending email digest' } as any };

  try {
    emailDigestResult = await sendEmailDigests(batchId, limitNum);
  } catch (err) {
    logger.error(err);

    return resTrack;
  }

  let digestSummary = '';

  for (const emailType in emailDigestResult.sentListByEmailDigestType) {
    digestSummary += `${emailType}: ${emailDigestResult.sentListByEmailDigestType[emailType].length}\n`;

    if (emailDigestResult.sentListByEmailDigestType[emailType].length > 0) {
      digestSummary += `Failed ${emailType}: ${emailDigestResult.failedListByEmailDigestType[emailType].length}\n`;
    }
  }

  await queueDiscordWebhook(DiscordChannel.DevPriv, `📧 **Email Digest**\n${digestSummary}`);
  resTrack.status = 200;
  resTrack.json = { success: true, sent: emailDigestResult.sentListByEmailDigestType, failed: emailDigestResult.failedListByEmailDigestType };

  return resTrack;
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

  // default limit to 1000
  const limitNum = limit ? parseInt(limit as string) : 1000;

  const resTrack = await runEmailDigest(limitNum);

  return res.status(resTrack.status).json(resTrack.json);
});
