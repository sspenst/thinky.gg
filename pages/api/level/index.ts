import { ObjectId } from 'bson';
import type { NextApiResponse } from 'next';
import generateSlug from '../../../helpers/generateSlug';
import getTs from '../../../helpers/getTs';
import { logger } from '../../../helpers/logger';
import revalidateUrl, { RevalidatePaths } from '../../../helpers/revalidateUrl';
import dbConnect from '../../../lib/dbConnect';
import getCollectionUserIds from '../../../lib/getCollectionUserIds';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { CollectionModel, LevelModel } from '../../../models/mongoose';

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  try {
    if (!req.body) {
      return res.status(400).json({
        error: 'Missing required fields',
      });
    }

    const { authorNote, collectionIds, name, points } = req.body;

    if (!name || points === undefined || !collectionIds) {
      return res.status(400).json({
        error: 'Missing required fields',
      });
    }

    if (points < 0 || points > 10) {
      return res.status(400).json({
        error: 'Points must be a number between 0-10',
      });
    }

    await dbConnect();

    const levelId = new ObjectId();
    // TODO: in extremely rare cases there could be a race condition, might need a transaction here
    const slug = await generateSlug(req.user.name, name);

    await Promise.all([
      LevelModel.create({
        _id: levelId,
        authorNote: authorNote,
        data: '4000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000003',
        height: 10,
        isDraft: true,
        leastMoves: 0,
        name: name,
        points: points,
        slug: slug,
        ts: getTs(),
        userId: req.userId,
        width: 10,
      }),
      CollectionModel.updateMany({
        _id: { $in: collectionIds },
        userId: { $in: getCollectionUserIds(req.user) },
      }, {
        $addToSet: {
          levels: levelId,
        },
      }),
    ]);

    await revalidateUrl(res, RevalidatePaths.HOMEPAGE);

    return res.status(200).json({ success: true, _id: levelId });
  } catch (err) {
    logger.trace(err);

    return res.status(500).json({
      error: 'Error creating level',
    });
  }
});
