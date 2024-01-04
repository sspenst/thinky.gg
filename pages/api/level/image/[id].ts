import mongoose from 'mongoose';
import { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper, { ValidObjectIdPNG } from '../../../../helpers/apiWrapper';
import { logger } from '../../../../helpers/logger';
import dbConnect from '../../../../lib/dbConnect';
import Image from '../../../../models/db/image';
import Level from '../../../../models/db/level';
import { ImageModel, LevelModel } from '../../../../models/mongoose';

export default apiWrapper({ GET: {
  query: {
    id: ValidObjectIdPNG(true),
  }
} }, async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query as { id: string };

  // strip .png from id
  const levelId = (id.toString()).replace(/\.png$/, '');

  await dbConnect();

  const level = await LevelModel.findOne<Level>({ _id: levelId, isDeleted: { $ne: true } });

  if (!level) {
    return res.status(404).json({
      error: 'Level not found',
    });
  }

  if (level.isDraft) {
    return res.status(401).json({
      error: 'Level is not published',
    });
  }

  const session = await mongoose.startSession();
  let pngData: Buffer | undefined;

  try {
    await session.withTransaction(async () => {
      const levelImage = await ImageModel.findOne<Image>({ documentId: levelId }, {}, { session: session });

      if (levelImage) {
        pngData = levelImage.image;
        res.setHeader('Content-Type', 'image/png');
        // set cache for 2 weeks
        res.setHeader('Cache-Control', 'public, max-age=1209600');
        res.setHeader('Expires', new Date(Date.now() + 1209600000).toUTCString());
        res.setHeader('Content-Length', pngData.length);
      } else {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

        return res.status(404).json({
          error: 'Image not found for level',
        });
      }
    });
    session.endSession();
  } catch (err) {
    logger.error(err);
    session.endSession();

    // set cache headers to not cache this
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    return res.status(500).json({
      error: `Error getting level image for id ${levelId}`,
    });
  }

  return res.status(200).send(pngData);
});
