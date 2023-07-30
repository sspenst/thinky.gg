import Direction from '@root/constants/direction';
import { BEST_CHECKPOINT_INDEX } from '@root/hooks/useCheckpoints';
import { NextApiResponse } from 'next';
import { ValidDirections, ValidNumber } from '../../../../../helpers/apiWrapper';
import isPro from '../../../../../helpers/isPro';
import withAuth, { NextApiRequestWithAuth } from '../../../../../lib/withAuth';
import { KeyValueModel, LevelModel } from '../../../../../models/mongoose';

export default withAuth({
  GET: {},
  POST: {
    body: {
      index: ValidNumber(true, 0, 10),
      directions: ValidDirections(),
    }
  },
  DELETE: {
    query: {
      index: ValidNumber(true, 0, 9),
    }
  },
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (!isPro(req.user)) {
    return res.status(401).json({
      error: 'Not authorized',
    });
  }

  const { id: levelId } = req.query as { id: string };
  const KV_Checkpoint_Hash = req.userId + '_' + levelId + '_checkpoints';
  const level = await LevelModel.findById(levelId);

  if (!level) {
    return res.status(404).json({
      error: 'Level not found',
    });
  }

  if (req.method === 'GET') {
    const checkpoint = await KeyValueModel.findOne({ key: KV_Checkpoint_Hash });
    const checkpointArr = [];

    for (let i = 0; i < 11; i++) {
      checkpointArr[i] = checkpoint?.value[i];
    }

    return res.status(200).json(checkpointArr);
  } else if (req.method === 'POST') {
    const { index, directions } = req.body as { index: number, directions: Direction[] };

    // always overwrite draft levels
    if (!level.isDraft && index === BEST_CHECKPOINT_INDEX) {
      const existingCheckpoint = await KeyValueModel.findOne({ key: KV_Checkpoint_Hash });
      const savedMovedCount = existingCheckpoint?.value[String(BEST_CHECKPOINT_INDEX)]?.length;

      if (savedMovedCount && savedMovedCount <= directions.length) {
        return res.status(400).json({
          error: 'Best checkpoint must have a lower move count',
        });
      }
    }

    /** findOneAndUpdate upsert this value... We need to be able set the specific index of the array the value of directions */
    const checkpoint = await KeyValueModel.findOneAndUpdate(
      { key: KV_Checkpoint_Hash },
      { $set: { [`value.${index}`]: directions } },
      { upsert: true, new: true }
    );

    return res.status(200).json(checkpoint?.value);
  } else if (req.method === 'DELETE') {
    const { index } = req.query;

    /** findOneAndUpdate upsert this value... We need to be able set the specific index of the array the value of directions */
    const checkpoint = await KeyValueModel.findOneAndUpdate(
      { key: KV_Checkpoint_Hash },
      { $unset: { [`value.${index}`]: '' } },
      { upsert: true, new: true }
    );

    return res.status(200).json(checkpoint?.value);
  }
});
