import { ObjectId } from 'bson';
import type { NextApiResponse } from 'next';
import Theme from '../../../constants/theme';
import dbConnect from '../../../lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { UserConfigModel } from '../../../models/mongoose';

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'GET') {
    await dbConnect();

    let userConfig = await UserConfigModel.findOne({ userId: req.userId }, {}, { lean: true });

    if (!userConfig) {
      userConfig = await UserConfigModel.create({
        _id: new ObjectId(),
        sidebar: true,
        theme: Theme.Modern,
        userId: req.userId,
      });
    }

    return res.status(200).json(userConfig);
  } else if (req.method === 'PUT') {
    if (!req.body) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const {
      sidebar,
      theme,
      tutorialCompletedAt,
    } = req.body;

    const setObj: {[k: string]: string} = {};

    if (sidebar !== undefined) {
      setObj['sidebar'] = sidebar;
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
      await UserConfigModel.updateOne({ userId: req.userId }, { $set: setObj });
    } catch (err) {
      return res.status(500).json({ error: 'Error updating config', updated: false });
    }

    return res.status(200).json({ updated: true });
  } else {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }
});
