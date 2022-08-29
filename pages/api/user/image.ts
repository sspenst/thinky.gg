import { ObjectId } from 'bson';
import { Magic, MAGIC_MIME_TYPE } from 'mmmagic';
import { NextApiResponse } from 'next';
import sharp from 'sharp';
import { TimerUtil } from '../../../helpers/getTs';
import { logger } from '../../../helpers/logger';
import dbConnect from '../../../lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { ImageModel, UserModel } from '../../../models/mongoose';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb',
    },
  },
};

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method !== 'PUT') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  if (!req.body) {
    return res.status(400).json({
      error: 'Missing required parameters',
    });
  }

  const image = req.body;

  // check if image is a buffer, array buffer, or array like object or array like object with a length property
  if (!image || !image.length) {
    return res.status(400).json({
      error: 'Missing required parameters',
    });
  }

  if (image.length > 2 * 1024 * 1024) {
    return res.status(400).json({
      error: 'Image size must be less than 2MB',
    });
  }

  await dbConnect();

  const imageBuffer = Buffer.from(image, 'binary');
  const magic = new Magic(MAGIC_MIME_TYPE);

  magic.detect(imageBuffer, async function(err, result) {
    if (err) {
      logger.error(err);

      return res.status(500).json({
        error: 'Error inspecting file',
      });
    }

    if (!['image/png', 'image/jpeg'].includes(result as string)) {
      return res.status(400).json({
        error: 'Invalid file type',
      });
    }

    try {
      const [imageModel, resizedImageBuffer] = await Promise.all([
        ImageModel.findOne({ documentId: req.userId }),
        sharp(imageBuffer).resize(300, 300).toFormat('png').toBuffer(),
      ]);

      const ts = TimerUtil.getTs();

      await Promise.all([
        !imageModel ?
          ImageModel.create({
            _id: new ObjectId(),
            documentId: req.userId,
            image: resizedImageBuffer,
            ts: ts,
          })
          :
          ImageModel.updateOne({ documentId: req.userId }, { $set: {
            image: resizedImageBuffer,
            ts: ts,
          } }),
        UserModel.updateOne({ _id: req.userId }, { $set: { avatarUpdatedAt: ts } }),
      ]);

      return res.status(200).send({ updated: true });
    } catch (e){
      logger.error(e);

      return res.status(500).json({

        error: 'Error updating image',
      });
    }
  });
});
