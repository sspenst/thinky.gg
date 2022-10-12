import { convert } from 'html-to-text';
import { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EmailDigestSettingTypes, EmailKVTypes } from '../../../../constants/emailDigest';
import apiWrapper, { ValidType } from '../../../../helpers/apiWrapper';
import { logger } from '../../../../helpers/logger';
import dbConnect from '../../../../lib/dbConnect';
import isLocal from '../../../../lib/isLocal';
import KeyValue from '../../../../models/db/keyValue';
import User from '../../../../models/db/user';
import { KeyValueModel, NotificationModel, UserConfigModel } from '../../../../models/mongoose';
import { getLevelOfDay } from '../../level-of-day';

interface GroupedNotificationsByUser {
    [key: string]: {
      userId: User;
      notifications: Notification[];
    };
  }

async function getUsersWithUnreadNotificationsPast24(): Promise<GroupedNotificationsByUser> {
  // group unread notifications in past 24h... then group by user
  const notifications = await NotificationModel.find({
    read: false,
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  }).populate('userId', '_id name email').populate('source').populate('target').lean();

  const grouped = notifications.reduce((acc, notification) => {
    if (!acc[notification.userId._id]) {
      acc[notification.userId._id] = {
        userId: notification.userId,
        notifications: [],
      };
    }

    acc[notification.userId._id].notifications.push(notification);

    return acc;
  }
  , {});

  return grouped;
}

async function sendMail(to: string, subject: string, body: string, textVersion: string) {
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
    from: `Pathology Daily Digest <${pathologyEmail}>`,
    to: to,
    subject: subject,
    html: body,
    text: textVersion
  };

  return await transporter.sendMail(mailOptions);
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
  const sentList = [];

  try {
    const users = await getUsersWithUnreadNotificationsPast24();

    logger.info('There are ' + Object.keys(users).length + ' users with unread notifications in the past 24 hours');

    const levelOfDay = await getLevelOfDay();

    for (const group of Object.values(users)) {
      const { userId, notifications } = group;
      // check if userId has a userConfig not set to never
      const userConfig = await UserConfigModel.findOne({ userId: userId._id }).lean();

      if (!userConfig) {
        logger.warn('User ' + userId.name + ' has no userConfig');
        continue;
      }

      if (userConfig.emailDigest === EmailDigestSettingTypes.NONE) {
        logger.warn('Skipping user ' + userId.name + ' because they have emailDigest set to NONE');
        continue;
      }

      const lastSent: KeyValue = await KeyValueModel.findOne({ key: EmailKVTypes.LAST_TS_EMAIL_DIGEST + userId._id.toString() }).lean();
      const lastSentTs = lastSent ? lastSent.value as unknown as number : 0;

      // check if last sent is within 24 hours
      if (lastSent && new Date(lastSentTs).getTime() > Date.now() - 24 * 60 * 60 * 1000) {
        logger.warn('Skipping user ' + userId.name + ' because they have already received an email digest in the past 24 hours');
        continue;
      }

      logger.warn('Sending email to user ' + userId.name + ' (' + userId.email + ')');
      const todaysDatePretty = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const subject = 'You have ' + notifications.length + ' new notifications';
      /* istanbul ignore next */
      const element = (
        <html>
          <body>
            <table role='presentation' cellPadding='0' cellSpacing='0' style={{
              backgroundColor: '#000',
              borderCollapse: 'separate',
              fontFamily: 'sans-serif',
              width: '100%',
            }}>
              <tr>
                <td align='center' style={{
                  display: 'block',
                  padding: 20,
                  verticalAlign: 'top',
                }}>
                  <table role='presentation' cellPadding='0' cellSpacing='0' style={{
                    color: '#FFF',
                    maxWidth: 580,
                  }}>
                    <tr>
                      <td>
                        <div style={{
                          backgroundColor: 'rgb(38, 38, 38)',
                          borderColor: 'rgb(130, 130, 130)',
                          borderRadius: 20,
                          borderStyle: 'solid',
                          borderWidth: 1,
                          padding: 20,
                        }}>
                          <a href='https://pathology.gg'>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src='https://i.imgur.com/fD1SUrZ.png' alt='Pathology' />
                          </a>
                          <h1>Hi {userId.name},</h1>
                          <p>Welcome to the Pathology daily digest for {todaysDatePretty}</p>
                          <p>You have <a href='https://pathology.gg/notifications?source=email-digest&filter=unread' style={{
                            color: '#337ab7',
                            textDecoration: 'none',
                          }}>{notifications.length} unread notifications</a></p>
                          {levelOfDay &&
                          <div>
                            <h2>Check out the level of the day:</h2>
                            <div style={{
                              textAlign: 'center',
                            }}>
                              <a href={`https://pathology.gg/level/${levelOfDay.slug}`} style={{
                                color: '#337ab7',
                                textDecoration: 'none',
                              }}>
                                {levelOfDay.name}
                              </a>
                              {' by '}
                              <a href={`https://pathology.gg/profile/${encodeURI(levelOfDay.userId.name)}`} style={{
                                color: '#337ab7',
                                textDecoration: 'none',
                              }}>
                                {levelOfDay.userId.name}
                              </a>
                              <div style={{
                                padding: 20,
                              }}>
                                <a href={`https://pathology.gg/level/${levelOfDay.slug}`} style={{
                                  color: '#337ab7',
                                  textDecoration: 'none',
                                }}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={`https://pathology.gg/api/level/image/${levelOfDay._id}.png`} width='100%' alt={levelOfDay.name} />
                                </a>
                              </div>
                            </div>
                          </div>
                          }
                          <div style={{
                            padding: 10,
                            textAlign: 'center',
                          }}>
                          Thanks for using <a href='https://pathology.gg' style={{
                              color: '#337ab7',
                              textDecoration: 'none',
                            }}>Pathology</a>!
                          </div>
                          <div id='footer' style={{
                            fontSize: '10px',
                            color: '#999',
                            textAlign: 'center',
                          }}>
                            <p>Join the <a href='https://discord.gg/kpfdRBt43v' style={{
                              color: '#337ab7',
                              textDecoration: 'none',
                            }}>Pathology Discord</a> to chat with other players and the developers!</p>
                            <p><a href='https://pathology.gg/settings' style={{
                              color: '#337ab7',
                              textDecoration: 'none',
                            }}>Manage your email notification settings</a></p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      );

      const body = renderToStaticMarkup(element);

      const textVersion = convert(body, {
        wordwrap: 130,
      });
      // can test the output here:
      // https://htmlemail.io/inline/
      // console.log(body);

      await sendMail(userId.email, subject, body, textVersion);
      // log that we sent the digest (after sendMail)
      await KeyValueModel.updateOne({ key: EmailKVTypes.LAST_TS_EMAIL_DIGEST + userId._id.toString() }, {
        key: EmailKVTypes.LAST_TS_EMAIL_DIGEST + userId._id.toString(),
        value: Date.now(),
      }, {
        upsert: true,
      });

      sentList.push(userId.email);
    }
  } catch (err) {
    logger.error('Error sending email digest', err);

    return res.status(500).json({
      error: 'Error sending email digest',
    });
  }

  return res.status(200).json({ success: true, sent: sentList });
});
