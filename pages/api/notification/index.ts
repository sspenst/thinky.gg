import { enrichReqUser } from '@root/helpers/enrich';
import { requestBroadcastNotifications } from '@root/lib/appSocketToClient';
import { Types } from 'mongoose';
import { NextApiResponse } from 'next';
import { ValidObjectIdArray, ValidType } from '../../../helpers/apiWrapper';
import { logger } from '../../../helpers/logger';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { NotificationModel } from '../../../models/mongoose';

// GET api/notifications returns a mobile notification
export default withAuth({
  PUT: {
    body: {
      ids: ValidObjectIdArray(),
      read: ValidType('boolean'),
    }
  } }, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'PUT') {
    const { ids, read } = req.body;

    try {
      const update = await NotificationModel.updateMany(
        {
          _id: { $in: ids },
        },
        {
          $set: {
            read: read,
          },
        }
      );

      if (update.modifiedCount === 0) {
        return res.status(400).json({ error: 'No notifications updated' });
      }

      // if successful, return 200 with the user's notifications
      const [reqUser] = await Promise.all([
        enrichReqUser(req.gameId, req.user),
        requestBroadcastNotifications(req.gameId, new Types.ObjectId(req.user._id.toString())),
      ]);

      const updatedNotifications = reqUser.notifications.map((notification) => {
      // check if notification_id is in ids
        if (ids.includes(notification._id.toString())) {
          return {
            ...notification,
            read: read,
          };
        }

        return notification;
      });

      return res.status(200).json(updatedNotifications);
    } catch (e) {
      logger.error(e);

      return res.status(500).json({ error: 'Internal server error' });
    }
  }
});
