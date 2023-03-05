import { Types } from 'mongoose';
import type { NextApiResponse } from 'next';
import { ValidObjectIdArray, ValidType } from '../../../helpers/apiWrapper';
import { generateLevelSlug } from '../../../helpers/generateSlug';
import { TimerUtil } from '../../../helpers/getTs';
import { logger } from '../../../helpers/logger';
import dbConnect from '../../../lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { CollectionModel, LevelModel } from '../../../models/mongoose';

export default withAuth({ POST: {
  body: {
    authorNote: ValidType('string', false),
    collectionIds: ValidObjectIdArray(),
    data: ValidType('string'),
    name: ValidType('string'),
  }
} }, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  try {
    const { authorNote, collectionIds, data, name } = req.body;

    await dbConnect();

    const levelId = new Types.ObjectId();
    const rows = data.split('\n');
    const trimmedName = name.trim();
    // TODO: in extremely rare cases there could be a race condition, might need a transaction here
    const slug = await generateLevelSlug(req.user.name, trimmedName);

    await Promise.all([
      LevelModel.create({
        _id: levelId,
        authorNote: authorNote?.trim(),
        data: data,
        height: rows.length,
        isDraft: true,
        leastMoves: 0,
        name: trimmedName,
        slug: slug,
        ts: TimerUtil.getTs(),
        userId: req.userId,
        width: rows[0].length,
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
