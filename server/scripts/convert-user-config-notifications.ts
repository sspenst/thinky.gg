// ts-node -r tsconfig-paths/register --files server/scripts/convert-user-config-notifications.ts

import NotificationType from '@root/constants/notificationType';
import cliProgress from 'cli-progress';
import dotenv from 'dotenv';
import dbConnect from '../../lib/dbConnect';
import { UserConfigModel } from '../../models/mongoose';

'use strict';

dotenv.config();
console.log('loaded env vars');
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

async function convertUserConfigNotifications() {
  console.log('connecting to db...');
  await dbConnect();
  console.log('connected');

  const userConfigCount = await UserConfigModel.countDocuments();

  progressBar.start(userConfigCount, 0);

  for await (const userConfig of UserConfigModel.find()) {
    const emailNotificationsList = userConfig.emailNotificationsList ?? [];
    const disallowedEmailNotifications = Object.values(NotificationType).filter((type) => !emailNotificationsList.includes(type));
    const pushNotificationsList = userConfig.pushNotificationsList ?? [];
    const disallowedPushNotifications = Object.values(NotificationType).filter((type) => !pushNotificationsList.includes(type));

    if (disallowedEmailNotifications.includes(NotificationType.UPGRADED_TO_PRO)) {
      disallowedEmailNotifications.splice(disallowedEmailNotifications.indexOf(NotificationType.UPGRADED_TO_PRO), 1);
    }

    if (disallowedPushNotifications.includes(NotificationType.UPGRADED_TO_PRO)) {
      disallowedPushNotifications.splice(disallowedPushNotifications.indexOf(NotificationType.UPGRADED_TO_PRO), 1);
    }

    await UserConfigModel.updateOne({ _id: userConfig._id }, {
      $set: {
        disallowedEmailNotifications: disallowedEmailNotifications,
        disallowedPushNotifications: disallowedPushNotifications,
      },
      $unset: { emailNotificationsList: '', pushNotificationsList: '' },
    });

    progressBar.increment();
  }

  progressBar.stop();
  process.exit(0);
}

convertUserConfigNotifications();
