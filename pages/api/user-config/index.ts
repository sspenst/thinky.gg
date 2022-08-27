import { ObjectId } from 'bson';
import type { NextApiResponse } from 'next';
import Theme from '../../../constants/theme';
import dbConnect from '../../../lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { UserConfigModel } from '../../../models/mongoose';

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'GET') {
    await dbConnect();

    if (req.userId === null) {
      return res.status(401).end();
    }

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
    await dbConnect();

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

    try {
      await UserConfigModel.updateOne({ userId: req.userId }, { $set: setObj });
    } catch (err) {
      return res.status(400).json({ updated: false });
    }

    return res.status(200).json({ updated: true });
  } else {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }
});
