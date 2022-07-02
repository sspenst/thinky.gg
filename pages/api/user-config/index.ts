import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import type { NextApiResponse } from 'next';
import { ObjectId } from 'bson';
import Theme from '../../../constants/theme';
import { UserConfigModel } from '../../../models/mongoose';
import dbConnect from '../../../lib/dbConnect';

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'GET') {
    await dbConnect();

    if (req.userId === null) {
      return res.status(401).end();
    }

    let userConfig = await UserConfigModel.findOne({ userId: req.userId });

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
    } = req.body;

    const setObj: {[k: string]: string} = {};

    if (sidebar !== undefined) {
      setObj['sidebar'] = sidebar;
    }

    if (theme !== undefined) {
      setObj['theme'] = theme;
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
