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
  let levelOfDayHTML = null;

  if (levelOfDay) {
    levelOfDayHTML = (
      <div>
        <h2>Check out the level of the day</h2>
        <div style={{
          justifyContent: 'center',
          textAlign: 'center',
          alignItems: 'center',
          flexDirection: 'column',
        }}>
          <a href={`https://pathology.gg/level/${levelOfDay.slug}`}>
            {levelOfDay.name}
          </a>
          {' by '}
          <a href={`https://pathology.gg/profile/${encodeURI(levelOfDay.userId.name)}`}>
            {levelOfDay.userId.name}
          </a>
          <a href={`https://pathology.gg/level/${levelOfDay.slug}`}>
            <img src={`https://pathology.gg/api/level/image/${levelOfDay._id}.png`} width='100%' alt={levelOfDay.name} />
          </a>
        </div>
      </div>
    );
  }

  for (const group of Object.values(users)) {
    const { userId, notifications } = group;

    const notificationListsHTML = '';

    const subject = 'You have ' + notifications.length + ' new notifications';

    const element = (
      <html style={{
        maxWidth: '70ch',
        /* larger spacing on larger screens, very small spacing on tiny screens */
        padding: 'calc(1vmin + .5rem)',
        /* shorthand for margin-left/margin-right */
        marginInline: 'auto',
        /* fluid sizing: https://frontaid.io/blog/fluid-typography-2d-css-locks-clamp/ */
        fontSize: 'clamp(1em, 0.909em + 0.45vmin, 1.25em)',
        /* use system font stack: https://developer.mozilla.org/en-US/docs/Web/CSS/font-family */
        fontFamily: 'system-ui',
      }}>
        <head>
          <style>
            {
              `a {
                color: #337ab7;
                text-decoration: none;
              }
              p {
                margin: 0 0 10px;
              }
              button {
                border-radius: 0.25rem;
                pointer: cursor;
              }`
            }
          </style>
        </head>
        <body className='email'>
          <h1>Hi {userId.name}</h1>
          <p>You have <a href='https://pathology.gg/notifications?source=email-digest'>{notifications.length} unread notifications</a></p>
          <div>
            {notificationListsHTML ? notificationListsHTML : ''}
          </div>
          {levelOfDayHTML}
          <div style={{
            justifyContent: 'center',
            textAlign: 'center',
            alignItems: 'center',
            flexDirection: 'column',
          }}>
            <p>Thanks for using <a href='https://pathology.gg'>Pathology</a>!</p>
          </div>
          <div id='footer' style={{
            fontSize: '10px',
            color: '#999',
            textAlign: 'center',
          }}>
            <p>Join the <a href='https://discord.gg/kpfdRBt43v'>Pathology Discord</a> to chat with other players and the developers!</p>
            <p><a href='https://pathology.gg/settings'>Manage your email notification settings</a></p>
          </div>
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
