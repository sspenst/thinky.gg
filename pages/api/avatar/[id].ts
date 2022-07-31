import { ImageModel, UserModel } from '../../../models/mongoose';
import { NextApiRequest, NextApiResponse } from 'next';
import User from '../../../models/db/user';
import dbConnect from '../../../lib/dbConnect';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  if (!req.query) {
    res.status(400).send('Missing required parameters');

    return;
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      error: 'Missing required parameters',
    });
  }

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
}
