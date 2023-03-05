import mongoose, { QueryOptions } from 'mongoose';
import { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper, { ValidObjectIdPNG } from '../../../../helpers/apiWrapper';
import getPngDataServer from '../../../../helpers/getPngDataServer';
import { TimerUtil } from '../../../../helpers/getTs';
import { logger } from '../../../../helpers/logger';
import dbConnect from '../../../../lib/dbConnect';
import Image from '../../../../models/db/image';
import Level from '../../../../models/db/level';
import { ImageModel, LevelModel } from '../../../../models/mongoose';

export async function upsertLevelImage(level: Level, queryOptions?: QueryOptions) {
  const pngData = await getPngDataServer(level);

  await ImageModel.findOneAndUpdate(
    { documentId: level._id },
    {
      documentId: level._id,
      image: pngData,
      ts: TimerUtil.getTs(),
    },
    {
      upsert: true,
      ...queryOptions,
    },
  );

  return pngData;
}

export default apiWrapper({ GET: {
  query: {
    id: ValidObjectIdPNG(true),
  }
} }, async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query as { id: string };

  // strip .png from id
  const levelId = (id.toString()).replace(/\.png$/, '');

  await dbConnect();

  const level = await LevelModel.findById<Level>(levelId);

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

  res.setHeader('Content-Type', 'image/png');
  // set cache for 2 weeks
  res.setHeader('Cache-Control', 'public, max-age=1209600');
  res.setHeader('Expires', new Date(Date.now() + 1209600000).toUTCString());

  const session = await mongoose.startSession();
  let pngData: Buffer | undefined;

  try {
    await session.withTransaction(async () => {
      const levelImage = await ImageModel.findOne<Image>({ documentId: levelId }, {}, { lean: false, session: session });

      if (levelImage) {
        pngData = levelImage.image;
      } else {
        pngData = await upsertLevelImage(level, { session: session });
      }
    });
    session.endSession();
  } catch (err) {
    logger.error(err);
    session.endSession();

    return res.status(500).json({
      error: `Error getting level image for id ${levelId}`,
    });
  }

  // should never happen but need to do this because typescript
  if (!pngData) {
    return res.status(500).json({
      error: `Error getting pngData for id ${levelId}`,
    });
  }

  res.setHeader('Content-Length', pngData.length);

  return res.status(200).send(pngData);
});
