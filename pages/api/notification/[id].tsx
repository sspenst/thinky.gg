import { ObjectId } from 'bson';
import { NextApiResponse } from 'next';
import { logger } from '../../../helpers/logger';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { NotificationModel } from '../../../models/mongoose';

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  // check method
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;

  // check id is objectid
  if (!id || !ObjectId.isValid(id as string)) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  const { read } = req.body;

  // check if read is a boolean
  if (typeof read !== 'boolean') {
    return res.status(400).json({ error: 'read must be a boolean' });
  }

  try {
    await NotificationModel.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          read: read,
        },
      },
      { new: true }
    );
    // if successful, return 200 with the user's notifications
    const updatedNotifications = req.user.notifications.map((notification) => {
      if (notification._id.toString() === id) {
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
