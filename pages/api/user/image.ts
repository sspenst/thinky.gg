import { MAGIC_MIME_TYPE, Magic } from 'mmmagic';
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

    const image = req.body;

    if (!image) {
      return res.status(400).json({
        error: 'Missing required parameters',
      });
    }

    await dbConnect();

    const imageBuffer = Buffer.from(image, 'binary');

    const magic = new Magic(MAGIC_MIME_TYPE);

    magic.detect(imageBuffer, async function(err, result) {
      if (err) {
        return res.status(500).json({
          error: 'Error inspecting file',
        });
      }

      if (!['image/png', 'image/jpeg', 'image/gif', 'image/bmp'].includes(result as string)) {
        return res.status(400).json({
          error: 'Invalid file type',
        });
      }

      const imageModel = await ImageModel.findOne({ documentId: req.userId });

      if (!imageModel) {
        await ImageModel.create({
          _id: new ObjectId(),
          documentId: req.userId,
          image: imageBuffer,
          ts: getTs(),
        });
      } else {
        await ImageModel.updateOne({ documentId: req.userId }, { $set: { image: imageBuffer } });
      }

      return res.status(200).send({ updated: true });
    });
  } else {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }
});
