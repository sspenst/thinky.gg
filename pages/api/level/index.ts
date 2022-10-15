import { ObjectId } from 'bson';
import type { NextApiResponse } from 'next';
import { generateLevelSlug } from '../../../helpers/generateSlug';
import { TimerUtil } from '../../../helpers/getTs';
import { logger } from '../../../helpers/logger';
import dbConnect from '../../../lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { CollectionModel, LevelModel } from '../../../models/mongoose';

export default withAuth({ POST: {} }, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  try {
    if (!req.body) {
      return res.status(400).json({
        error: 'Missing required fields',
      });
    }

    const { authorNote, collectionIds, name } = req.body;

    if (!name || !collectionIds) {
      return res.status(400).json({
        error: 'Missing required fields',
      });
    }

    await dbConnect();

    const levelId = new ObjectId();
    const trimmedName = name.trim();
    // TODO: in extremely rare cases there could be a race condition, might need a transaction here
    const slug = await generateLevelSlug(req.user.name, trimmedName);

    await Promise.all([
      LevelModel.create({
        _id: levelId,
        authorNote: authorNote?.trim(),
        data: '4000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000003',
        height: 10,
        isDraft: true,
        leastMoves: 0,
        name: trimmedName,
        slug: slug,
        ts: TimerUtil.getTs(),
        userId: req.userId,
        width: 10,
      }),
      CollectionModel.updateMany({
        _id: { $in: collectionIds },
        userId: req.userId,
      }, {
        $addToSet: {
          levels: levelId,
        },
      }),
    ]);

    return res.status(200).json({ success: true, _id: levelId });
  } catch (err) {
    logger.error(err);

    return res.status(500).json({
      error: 'Error creating level',
    });
  }
});
