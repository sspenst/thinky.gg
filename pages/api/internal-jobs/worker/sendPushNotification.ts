import { GameId } from '@root/constants/GameId';
import getMobileNotification from '@root/helpers/getMobileNotification';
import Device from '@root/models/db/device';
import Notification from '@root/models/db/notification';
import { DeviceModel } from '@root/models/mongoose';
import admin from 'firebase-admin';

/**
 * Send a mobile push notification
 * NB: assumes the user's push notification settings have already been checked
 */
export async function sendPushNotification(gameId: GameId, notification: Notification) {
  if (process.env.NODE_ENV === 'test') {
    return 'push notification not sent [test]';
  }

  if (!process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_PROJECT_ID) {
    return 'push not sent. Firebase environment variables not set';
  }

  const notificationId = notification._id.toString();
  const devices = await DeviceModel.find({ userId: notification.userId._id });
  let log = '';

  if (devices.length === 0) {
    log = `Notification ${notificationId} not sent: no devices found`;
  } else {
    const mobileNotification = getMobileNotification(gameId, notification);
    const tokens = devices.map((token: Device) => token.deviceToken);

    if (!global.firebaseApp) {
      global.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          'client_email': process.env.FIREBASE_CLIENT_EMAIL,
          'private_key': process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          'project_id': process.env.FIREBASE_PROJECT_ID,
        } as admin.ServiceAccount),
      });
    }

    const res = await global.firebaseApp.messaging().sendEachForMulticast({
      tokens: tokens,
      data: {
        notificationId: notification._id.toString(),
        url: mobileNotification.url,
      },
      notification: {
        title: mobileNotification.title,
        body: mobileNotification.body,
        imageUrl: mobileNotification.imageUrl,
      },
      apns: {
        payload: {
          aps: {
            'mutable-content': 1,
            'content-available': 1,
          },
          notifee_options: {
            data: {
              notificationId: notification._id.toString(),
              url: mobileNotification.url,
            },
            image: mobileNotification.imageUrl,
          },
        },
      },
      android: {
        notification: {
          imageUrl: mobileNotification.imageUrl,
        },
      },
    });
    const responseJSON = JSON.stringify(res);

    log = `${responseJSON}`;
  }

  return log;
}
