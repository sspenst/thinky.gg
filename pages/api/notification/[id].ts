import { ObjectId } from 'bson';
import { NextApiResponse } from 'next';
import { logger } from '../../../helpers/logger';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { NotificationModel } from '../../../models/mongoose';

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  // check method
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!req.body) {
    return res.status(400).json({ error: 'Bad request' });
  }

  const { read, ids } = req.body;

  // check that all ids are ObjectIds
  if (!ids || !ids.every((id: string) => ObjectId.isValid(id))) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  // check if read is a boolean
  if (typeof read !== 'boolean') {
    return res.status(400).json({ error: 'read must be a boolean' });
  }

  try {
    const update = await NotificationModel.findOneAndUpdate(
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

    if (!update) {
      return res.status(404).json({ error: 'Not found' });
    }

    // if successful, return 200 with the user's notifications
    const updatedNotifications = req.user.notifications.map((notification) => {
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
});
