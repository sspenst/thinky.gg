import { ValidObjectId, ValidType } from '../../../helpers/apiWrapper';
import withAuth from '../../../lib/withAuth';
import { NotificationPushTokenModel } from '../../../models/mongoose';

export default withAuth({
  PUT: {
    body: {
      deviceToken: ValidType('string', true),
      deviceName: ValidType('string', false),
      deviceBrand: ValidType('string', false),
      deviceOSName: ValidType('string', false),
      deviceOSVersion: ValidType('string', false),
    }
  },
  DELETE: {
    body: {
      deviceToken: ValidType('string', false),
    }

  },

}, async (req, res) => {
  if (req.method === 'PUT') {
    const tokenEntry = await NotificationPushTokenModel.findOneAndUpdate({
      userId: req.user._id,
      deviceToken: req.body.deviceToken,
    }, {
      deviceToken: req.body.deviceToken,
      deviceName: req.body.deviceName,
      deviceBrand: req.body.deviceBrand,
      deviceOSName: req.body.deviceOSName,
      deviceOSVersion: req.body.deviceOSVersion,
      userId: req.user._id,
    }, {
      upsert: true,
      new: true,
    });

    if (!tokenEntry) {
      return res.status(400).json({ error: 'Failed to create token entry' });
    }

    return res.status(200).json(tokenEntry);
  } else if (req.method === 'DELETE') {
    const tokenEntry = await NotificationPushTokenModel.findOneAndDelete({
      userId: req.user._id,
      deviceToken: req.body.deviceToken,
    });

    if (!tokenEntry) {
      return res.status(400).json({ error: 'Failed to delete token entry' });
    }

    return res.status(200).json(tokenEntry);
  }
});
