import DiscordChannel from '@root/constants/discordChannel';
import apiWrapper, { ValidType } from '@root/helpers/apiWrapper';
import queueDiscordWebhook from '@root/helpers/discordWebhook';
import { logger } from '@root/helpers/logger';
import dbConnect from '@root/lib/dbConnect';
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
    const bounce = payload.bounce;

    for (const recipient of bounce.bouncedRecipients) {
      emailsBounced.push(recipient.emailAddress);
    }
  } catch (e) {
    logger.error(e);

    return res.status(500).json({ error: 'Error parsing payload from SES' });
  }

  // set all user's that have bounced to EmailDigestType.NONE
  // add all disallowedEmailNotifications for this user

  // TODO: uncomment this once we verify things are working
  /*
  await UserModel.updateMany({ email: { $in: emailsBounced } }, {
    $set: {
      emailDigestType: EmailDigestSettingType.NONE,
      disallowedEmailNotifications: Object.values(NotificationType),
    },
  });*/
  await queueDiscordWebhook(DiscordChannel.DevPriv,
    `Emails bounced: ${emailsBounced.join(', ')}. Currently in dry run mode so not unsubscribing.`
  );

  return res.status(200).json({ bounced: emailsBounced, success: true });
});
