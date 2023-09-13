import { getCheckpointKey } from '@root/helpers/checkpointHelpers';
import { BEST_CHECKPOINT_INDEX } from '@root/hooks/useCheckpoints';
import type { NextApiResponse } from 'next';
import { ValidNumber, ValidObjectId, ValidType } from '../../../helpers/apiWrapper';
import dbConnect from '../../../lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import { KeyValueModel, LevelModel } from '../../../models/mongoose';

export default withAuth({
  PUT: {
    body: {
      data: ValidType('string'),
      height: ValidNumber(),
      width: ValidNumber(),
    },
    query: {
      id: ValidObjectId()
    }
  } }, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  await dbConnect();
  const { id } = req.query;
  const level = await LevelModel.findOne<Level>({ _id: id, isDeleted: { $ne: true } }, {}, { lean: true });

  if (!level) {
    return res.status(404).json({
      error: 'Level not found',
    });
  }

  if (level.userId.toString() !== req.userId) {
    return res.status(401).json({
      error: 'Not authorized to edit this Level',
    });
  }

  if (!level.isDraft) {
    return res.status(400).json({
      error: 'Cannot edit a published level',
    });
  }

  const { data, height, width } = req.body;

  await Promise.all([
    LevelModel.updateOne({ _id: id }, {
      $set: {
        data: data.trim(),
        height: height,
        leastMoves: 0,
        width: width,
      },
    }, { runValidators: true }),
    // delete best checkpoint as it may now be invalid
    KeyValueModel.findOneAndUpdate(
      { key: getCheckpointKey(id as string, req.userId) },
      { $unset: { [`value.${BEST_CHECKPOINT_INDEX}`]: '' } },
    ),
  ]);

  return res.status(200).json(level);
});
