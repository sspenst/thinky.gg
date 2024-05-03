import Device from '@root/models/db/device';
import { ValidType } from '../../../helpers/apiWrapper';
import withAuth from '../../../lib/withAuth';
import { DeviceModel } from '../../../models/mongoose';

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
      deviceToken: ValidType('string', true),
    }
  },
}, async (req, res) => {
  if (req.method === 'PUT') {
    const device = await DeviceModel.findOneAndUpdate<Device>({
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

    return res.status(200).json(device);
  } else if (req.method === 'DELETE') {
    const device = await DeviceModel.findOneAndDelete<Device>({
      userId: req.user._id,
      deviceToken: req.body.deviceToken,
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    return res.status(200).json(device);
  }
});
