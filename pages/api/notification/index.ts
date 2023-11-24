import cleanUser from '@root/lib/cleanUser';
import Notification from '@root/models/db/notification';
import User from '@root/models/db/user';
import { NextApiResponse } from 'next';
import { ValidObjectIdArray, ValidType } from '../../../helpers/apiWrapper';
import { enrichReqUser, getEnrichNotificationPipelineStages } from '../../../helpers/enrich';
import { logger } from '../../../helpers/logger';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { NotificationModel } from '../../../models/mongoose';

// GET api/notifications returns a mobile notification
export default withAuth({
  GET: {},
  PUT: {
    body: {
      ids: ValidObjectIdArray(),
      read: ValidType('boolean'),
    }
  } }, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const notificationAgg = await NotificationModel.aggregate<Notification>([
      { $match: { userId: req.user._id } },
      { $sort: { createdAt: -1 } },
      { $limit: 5 },
      ...getEnrichNotificationPipelineStages(req.user)
    ]);

    notificationAgg.forEach(notification => {
      if (notification.sourceModel === 'User' && notification.source) {
        cleanUser(notification.source as User);
      }

      if (notification.targetModel === 'User' && notification.target) {
        cleanUser(notification.target as User);
      }
    });

    return res.status(200).json(notificationAgg);
  }

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
        },
        { new: true }
      );

      if (update.modifiedCount === 0) {
        return res.status(400).json({ error: 'No notifications updated' });
      }

      // if successful, return 200 with the user's notifications
      const reqUser = await enrichReqUser(req.user);
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
