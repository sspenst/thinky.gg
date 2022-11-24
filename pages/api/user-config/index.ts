import { ObjectId } from 'bson';
import type { NextApiResponse } from 'next';
import Theme from '../../../constants/theme';
import { ValidNumber, ValidType } from '../../../helpers/apiWrapper';
import { logger } from '../../../helpers/logger';
import dbConnect from '../../../lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { UserConfigModel } from '../../../models/mongoose';

export async function getUserConfig(userId: ObjectId) {
  let userConfig = await UserConfigModel.findOne({ userId: userId }, {}, { lean: true });

  if (!userConfig) {
    userConfig = await UserConfigModel.create({
      _id: new ObjectId(),
      theme: Theme.Modern,
      userId: userId,
    });
  }

  return userConfig;
}

export default withAuth({
  // NB: GET API currently unused - UserConfig returned through /api/user
  GET: {},
  PUT: {
    body: {
      emailDigest: ValidType('string', false),
      theme: ValidType('string', false),
      tutorialCompletedAt: ValidNumber(false),
    }
  },
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'GET') {
    await dbConnect();

    const userConfig = await getUserConfig(req.user._id);

    return res.status(200).json(userConfig);
  } else if (req.method === 'PUT') {
    const {
      emailDigest,
      theme,
      tutorialCompletedAt,
    } = req.body;

    const setObj: {[k: string]: string} = {};

    if (emailDigest !== undefined) {
      setObj['emailDigest'] = emailDigest;
    }

    if (theme !== undefined) {
      setObj['theme'] = theme;
    }

    if (tutorialCompletedAt) {
      setObj['tutorialCompletedAt'] = tutorialCompletedAt;
    }

    // check if setObj is blank
    if (Object.keys(setObj).length === 0) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    await dbConnect();

    try {
      const updateResult = await UserConfigModel.updateOne({ userId: req.userId }, { $set: setObj });

      /* istanbul ignore next */
      if (updateResult.acknowledged === false) {
        return res.status(500).json({ error: 'Error updating config', updated: false });
      }
    } catch (err) {
      logger.error(err);

      return res.status(500).json({ error: 'Error updating config', updated: false });
    }

    return res.status(200).json({ updated: true });
  }
});
