import { Types } from 'mongoose';
import { NextApiResponse } from 'next';
import sharp from 'sharp';
import Dimensions from '../../../constants/dimensions';
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

export function getMimeType(arrayBuffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(arrayBuffer);
  let mime = '';

  // Check the first 4 bytes of the ArrayBuffer to determine the MIME type
  if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47) {
    mime = 'image/png';
  } else if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8) {
    mime = 'image/jpeg';
  } else if (uint8Array[0] === 0x47 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46) {
    mime = 'image/gif';
  } else if (uint8Array[0] === 0x42 && uint8Array[1] === 0x4D) {
    mime = 'image/bmp';
  } else if (uint8Array[0] === 0x25 && uint8Array[1] === 0x50 && uint8Array[2] === 0x44 && uint8Array[3] === 0x46) {
    mime = 'application/pdf';
  }

  return mime;
}

export default withAuth({ PUT: {} }, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
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
  const fileType = getMimeType(imageBuffer);

  if (!fileType) {
    return res.status(400).json({
      error: 'Invalid file type',
    });
  }

  if (!['image/png', 'image/jpeg'].includes(fileType)) {
    return res.status(400).json({
      error: 'Invalid file type',
    });
  }

  try {
    const [imageModel, resizedImageBuffer] = await Promise.all([
      ImageModel.findOne({ documentId: req.userId }),
      sharp(imageBuffer).resize(Dimensions.Avatar, Dimensions.Avatar).toFormat('png').toBuffer(),
    ]);

    const ts = TimerUtil.getTs();

    await Promise.all([
      !imageModel ?
        ImageModel.create({
          _id: new Types.ObjectId(),
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
  } catch (e) {
    logger.error(e);

    return res.status(500).json({
      error: 'Error updating image',
    });
  }
});
