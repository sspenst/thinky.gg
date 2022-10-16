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
import UserConfig from '../../../../models/db/userConfig';
import { KeyValueModel, NotificationModel, UserConfigModel } from '../../../../models/mongoose';
import { getLevelOfDay } from '../../level-of-day';

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
    from: `Pathology <${pathologyEmail}>`,
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
    const levelOfDay = await getLevelOfDay();
    const userConfigs = await UserConfigModel.find({ emailDigest: {
      $in: [EmailDigestSettingTypes.DAILY, EmailDigestSettingTypes.ONLY_NOTIFICATIONS],
    } }).populate('userId', '_id name email').lean() as UserConfig[];

    for (const userConfig of userConfigs) {
      if (!userConfig.userId) {
        logger.warn('No user exists for userConfig with id ' + userConfig._id);
        continue;
      }

      const user = userConfig.userId as User;
      const notificationsCount = await NotificationModel.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        read: false,
        userId: user._id,
      });

      if (userConfig.emailDigest === EmailDigestSettingTypes.ONLY_NOTIFICATIONS && notificationsCount === 0) {
        logger.warn('Skipping user ' + user.name + ' because they have emailDigest set to ONLY_NOTIFICATIONS and have 0 unread notifications');
        continue;
      }

      const lastSent: KeyValue = await KeyValueModel.findOne({ key: EmailKVTypes.LAST_TS_EMAIL_DIGEST + user._id.toString() }).lean();
      const lastSentTs = lastSent ? lastSent.value as unknown as number : 0;

      // check if last sent is within 23 hours
      // NB: giving an hour of leeway because the email may not be sent at the identical time every day
      if (lastSent && new Date(lastSentTs).getTime() > Date.now() - 23 * 60 * 60 * 1000) {
        logger.warn('Skipping user ' + user.name + ' because they have already received an email digest in the past 24 hours');
        continue;
      }

      logger.warn('Sending email to user ' + user.name + ' (' + user.email + ')');

      const todaysDatePretty = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const subject = userConfig.emailDigest === EmailDigestSettingTypes.DAILY ?
        `Daily Digest - ${todaysDatePretty}` :
        `You have ${notificationsCount} new notification${notificationsCount !== 1 ? 's' : ''}`;
      /* istanbul ignore next */
      const element = (
        <html>
          <body>
            <table role='presentation' cellPadding='0' cellSpacing='0' style={{
              backgroundColor: '#FFF',
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
                    color: '#000',
                    maxWidth: 580,
                  }}>
                    <tr>
                      <td>
                        <div style={{
                          borderColor: '#BBB',
                          borderRadius: 20,
                          borderStyle: 'solid',
                          borderWidth: 1,
                          padding: 20,
                        }}>
                          <a href='https://pathology.gg'>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src='https://i.imgur.com/fD1SUrZ.png' alt='Pathology' />
                          </a>
                          <h1>Hi {user.name},</h1>
                          <p>Welcome to the Pathology daily digest for {todaysDatePretty}.</p>
                          <p>You have <a href='https://pathology.gg/notifications?source=email-digest&filter=unread' style={{
                            color: '#4890ce',
                            textDecoration: 'none',
                          }}>{notificationsCount} unread notification{notificationsCount !== 1 ? 's' : ''}</a></p>
                          {levelOfDay &&
                          <div>
                            <h2>Check out the level of the day:</h2>
                            <div style={{
                              textAlign: 'center',
                            }}>
                              <a href={`https://pathology.gg/level/${levelOfDay.slug}`} style={{
                                color: '#4890ce',
                                textDecoration: 'none',
                              }}>
                                {levelOfDay.name}
                              </a>
                              {' by '}
                              <a href={`https://pathology.gg/profile/${encodeURI(levelOfDay.userId.name)}`} style={{
                                color: '#4890ce',
                                textDecoration: 'none',
                              }}>
                                {levelOfDay.userId.name}
                              </a>
                              <div style={{
                                padding: 20,
                              }}>
                                <a href={`https://pathology.gg/level/${levelOfDay.slug}`} style={{
                                  color: '#4890ce',
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
                          Thanks for playing <a href='https://pathology.gg' style={{
                              color: '#4890ce',
                              textDecoration: 'none',
                            }}>Pathology</a>!
                          </div>
                          <div id='footer' style={{
                            fontSize: '10px',
                            color: '#999',
                            textAlign: 'center',
                          }}>
                            <p>Join the <a href='https://discord.gg/kpfdRBt43v' style={{
                              color: '#4890ce',
                              textDecoration: 'none',
                            }}>Pathology Discord</a> to chat with other players and the developers!</p>
                            <p><a href='https://pathology.gg/settings' style={{
                              color: '#4890ce',
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

      await sendMail(user.email, subject, body, textVersion);

      // log that we sent the digest (after sendMail)
      await KeyValueModel.updateOne({ key: EmailKVTypes.LAST_TS_EMAIL_DIGEST + user._id.toString() }, {
        key: EmailKVTypes.LAST_TS_EMAIL_DIGEST + user._id.toString(),
        value: Date.now(),
      }, {
        upsert: true,
      });

      sentList.push(user.email);
    }
  } catch (err) {
    logger.error('Error sending email digest', err);

    return res.status(500).json({
      error: 'Error sending email digest',
    });
  }

  return res.status(200).json({ success: true, sent: sentList });
});
