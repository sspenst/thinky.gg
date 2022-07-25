import { ImageModel, LevelModel } from '../../../../models/mongoose';
import { NextApiRequest, NextApiResponse } from 'next';
import Level from '../../../../models/db/level';
import { ObjectId } from 'bson';
import dbConnect from '../../../../lib/dbConnect';
import getPngDataServer from '../../../../helpers/getPngDataServer';
import getTs from '../../../../helpers/getTs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
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
    const levelId = (id.toString()).replace(/\.png$/, '');

    await dbConnect();

    let level: Level | null;

    try {
      level = await LevelModel.findOne<Level>({
        _id: levelId,
      });
    } catch {
      return res.status(400).json({
        error: 'Invalid id format',
      });
    }

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

    const levelImage = await ImageModel.findOne({ documentId: levelId });

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
      ts: getTs(),
    });

    return res.status(200).send(pngData);
  } else {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }
}
