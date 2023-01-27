import { NextApiResponse } from 'next';
import { ValidEnum, ValidObjectIdArray, ValidType } from '../../../helpers/apiWrapper';
import { enrichReqUser } from '../../../helpers/enrich';
import { logger } from '../../../helpers/logger';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { NotificationModel } from '../../../models/mongoose';
import { LEVEL_DEFAULT_PROJECTION } from '../../../models/schemas/levelSchema';
import { USER_DEFAULT_PROJECTION } from '../../../models/schemas/userSchema';

export default withAuth({
  DontUpdateLastSeen: true,
  GET: {
    query: {
      read: ValidType('boolean', false, true),
      min_timestamp: ValidType('number', true, true),
    }
  },
  PUT: {
    body: {
      ids: ValidObjectIdArray(),
      read: ValidType('boolean'),
    }
  } }, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const { read, min_timestamp } = req.query;

    const ts = parseInt(min_timestamp as string);
    const enrichedReqUser = await enrichReqUser(req.user, {
      createdAt: {
        $gt: new Date(ts),
      },
      ...(read !== undefined && { read: read === 'true' }),
    });

    return res.status(200).json(enrichedReqUser);
  }
  else if (req.method === 'PUT') {
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
    } catch (e){
      logger.error(e);

      return res.status(500).json({ error: 'Internal server error' });
    }
  }
});
