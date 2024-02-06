import DiscordChannel from '@root/constants/discordChannel';
import { EmailDigestSettingType } from '@root/constants/emailDigest';
import NotificationType from '@root/constants/notificationType';
import apiWrapper, { ValidType } from '@root/helpers/apiWrapper';
import queueDiscordWebhook from '@root/helpers/discordWebhook';
import { logger } from '@root/helpers/logger';
import dbConnect from '@root/lib/dbConnect';
import { UserModel } from '@root/models/mongoose';
import { NextApiRequest, NextApiResponse } from 'next';

export default apiWrapper({
  POST: {
    query: {
      secret: ValidType('string'),
    },
    body: {
      payload: ValidType('string'),
    },
  },
}, async (req: NextApiRequest, res: NextApiResponse) => {
  await dbConnect();

  if (req.query.secret !== process.env.SES_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const emailsBounced = [];

  try {
    const payload = JSON.parse(req.body.payload);

    if (!payload.Records) {
      throw new Error('No records found in payload');
    }

    for (const record of payload.Records) {
      const sns = record.Sns;

      if (!sns) {
        throw new Error('No Sns found in record');
      }

      const message = JSON.parse(sns.Message);
      const bounce = message.bounce;

      for (const recipient of bounce.bouncedRecipients) {
        emailsBounced.push(recipient.emailAddress);
      }
    }
  } catch (e) {
    logger.error(e);

    return res.status(500).json({ error: 'Error parsing payload from SES' });
  }

  // set all user's that have bounced to EmailDigestType.NONE
  // add all disallowedEmailNotifications for this user

  // TODO: uncomment this once we verify things are working

  await UserModel.updateMany({ email: { $in: emailsBounced } }, {
    $set: {
      emailDigestType: EmailDigestSettingType.NONE,
      disallowedEmailNotifications: Object.values(NotificationType),
    },
  });
  await queueDiscordWebhook(DiscordChannel.DevPriv,
    `Emails bounced: ${emailsBounced.join(', ')}. Unsubscribed these users from all email notifs and set their emailDigestType to NONE..`
  );

  return res.status(200).json({ bounced: emailsBounced, success: true });
});
