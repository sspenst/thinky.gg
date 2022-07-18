import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { ImageModel } from '../../../models/mongoose';
import { NextApiResponse } from 'next';
import { ObjectId } from 'bson';
import dbConnect from '../../../lib/dbConnect';
import getTs from '../../../helpers/getTs';

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'PUT') {
    if (!req.query) {
      res.status(400).send('Missing required parameters');

      return;
    }

    const { image } = req.query;

    if (!image) {
      return res.status(400).json({
        error: 'Missing required parameters',
      });
    }

    await dbConnect();

    // save buffer to database to cache
    await ImageModel.create({
      _id: new ObjectId(),
      documentId: req.userId,
      image: image,
      ts: getTs(),
    });

    return res.status(200).send({ updated: true });
  } else {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }
});
