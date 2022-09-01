import { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper, { ValidBlockMongoIDField } from '../../../helpers/apiWrapper';
import dbConnect from '../../../lib/dbConnect';
import User from '../../../models/db/user';
import { ImageModel, UserModel } from '../../../models/mongoose';

export default apiWrapper({ GET: {
  ...ValidBlockMongoIDField
} }, async (req: NextApiRequest, res: NextApiResponse) => {
  if (!req.query) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const { id } = req.query as { id: string };

  // strip .png from id
  const userId = (id.toString()).replace(/\.png$/, '');

  await dbConnect();

  let user: User | null;

  try {
    user = await UserModel.findOne<User>({
      _id: userId,
    });
  } catch {
    return res.status(400).json({
      error: 'Invalid id format',
    });
  }

  if (!user) {
    return res.status(404).json({
      error: 'User not found',
    });
  }

  const image = await ImageModel.findOne({ documentId: userId }, {}, { lean: false });

  if (image) {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', image.image.length);
    // set cache for 2 weeks
    res.setHeader('Cache-Control', 'public, max-age=1209600');
    res.setHeader('Expires', new Date(Date.now() + 1209600000).toUTCString());

    return res.status(200).send(image.image);
  }

  return res.status(200).send(null);
});
