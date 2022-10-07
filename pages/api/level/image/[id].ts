import { ObjectId } from 'bson';
import { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper, { ValidObjectIdPNG } from '../../../../helpers/apiWrapper';
import getPngDataServer from '../../../../helpers/getPngDataServer';
import { TimerUtil } from '../../../../helpers/getTs';
import dbConnect from '../../../../lib/dbConnect';
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

  const levelImage = await ImageModel.findOne({ documentId: levelId }, {}, { lean: false });

  if (levelImage) {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', levelImage.image.length);
    // set cache for 2 weeks
    res.setHeader('Cache-Control', 'public, max-age=1209600');
    res.setHeader('Expires', new Date(Date.now() + 1209600000).toUTCString());

    return res.status(200).send(levelImage.image);
  }

  const pngData = await getPngDataServer(level);

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Length', pngData.length);
  // set cache for 2 weeks
  res.setHeader('Cache-Control', 'public, max-age=1209600');
  res.setHeader('Expires', new Date(Date.now() + 1209600000).toUTCString());
  // save buffer to database to cache
  await ImageModel.create({
    _id: new ObjectId(),
    documentId: level._id,
    image: pngData,
    ts: TimerUtil.getTs(),
  });

  return res.status(200).send(pngData);
});
