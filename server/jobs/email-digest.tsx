// run with
// ts-node --files server/jobs/email-digest.tsx
// --transpile-only  in production
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { logger } from '../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../lib/dbConnect';
import isLocal from '../../lib/isLocal';
import Notification from '../../models/db/notification';
import User from '../../models/db/user';
import { NotificationModel } from '../../models/mongoose';
import { getLevelOfDay } from '../../pages/api/level-of-day';

dotenv.config();

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

async function sendMail(to: string, subject: string, body: string) {
  const pathologyEmail = 'pathology.do.not.reply@gmail.com';

  let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: pathologyEmail,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  if (isLocal()) {
    transporter = nodemailer.createTransport({
      host: 'smtp.mailtrap.io',
      port: 2525,
      auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASSWORD
      }
    });
  }

  const mailOptions = {
    from: `Pathology Daily Digest <${pathologyEmail}>`,
    to: to,
    subject: subject,
    html: body,
  };

  return await transporter.sendMail(mailOptions);
}

async function start() {
  console.log('Starting');
  await dbConnect();
  const users = await getUsersWithUnreadNotificationsPast24();

  logger.info('There are ' + Object.keys(users).length + ' users with unread notifications in the past 24 hours');
  //console.log(users);
  const levelOfDay = await getLevelOfDay();

  for (const group of Object.values(users)) {
    const { userId, notifications } = group;
    const subject = 'You have ' + notifications.length + ' new notifications';
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
                        <p>You have <a href='https://pathology.gg/notifications?source=email-digest' style={{
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

    // can test the output here:
    // https://htmlemail.io/inline/
    // console.log(body);

    await sendMail(userId.email, subject, body);
    break;
  }

  await dbDisconnect();
}

try {
  start();
} catch (e) {
  console.log('error', e);
}
