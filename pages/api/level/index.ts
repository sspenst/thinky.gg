import mongoose, { Types } from 'mongoose';
import type { NextApiResponse } from 'next';
import { ValidObjectIdArray, ValidType } from '../../../helpers/apiWrapper';
import { generateLevelSlug } from '../../../helpers/generateSlug';
import { TimerUtil } from '../../../helpers/getTs';
import { logger } from '../../../helpers/logger';
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
  const session = await mongoose.startSession();
  const levelId = new Types.ObjectId();

  try {
    await session.withTransaction(async () => {
      const { authorNote, collectionIds, data, name } = req.body;
      const rows = data.split('\n');
      const trimmedName = name.trim();
      const slug = await generateLevelSlug(req.user.name, trimmedName, undefined, { session: session });

      await Promise.all([
        LevelModel.create([{
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
        }], { session: session }),
        CollectionModel.updateMany({
          _id: { $in: collectionIds },
          userId: req.userId,
        }, {
          $addToSet: {
            levels: levelId,
          },
        }, { session: session }),
      ]);
    });

    session.endSession();
  } catch (err) /* istanbul ignore next */ {
    logger.error(err);
    session.endSession();

    return res.status(500).json({ error: 'Error creating level' });
  }

  return res.status(200).json({ success: true, _id: levelId });
});
