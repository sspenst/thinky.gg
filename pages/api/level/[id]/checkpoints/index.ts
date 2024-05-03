import Direction from '@root/constants/direction';
import { getCheckpointKey } from '@root/helpers/checkpointHelpers';
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
  const level = await LevelModel.findById(levelId, { gameId: 1, isDraft: 1 });

  if (!level) {
    return res.status(404).json({
      error: 'Level not found',
    });
  }

  const checkpointKey = getCheckpointKey(levelId, req.userId);

  if (req.method === 'GET') {
    const checkpoint = await KeyValueModel.findOne({ key: checkpointKey }); // don't need gameId since the key has the level id
    const checkpointArr = [];

    for (let i = 0; i < 11; i++) {
      checkpointArr[i] = checkpoint?.value[i];
    }

    return res.status(200).json(checkpointArr);
  } else if (req.method === 'POST') {
    const { index, directions } = req.body as { index: number, directions: Direction[] };

    // always overwrite draft levels
    if (!level.isDraft && index === BEST_CHECKPOINT_INDEX) {
      const existingCheckpoint = await KeyValueModel.findOne({ key: checkpointKey });
      const savedMovedCount = existingCheckpoint?.value[String(BEST_CHECKPOINT_INDEX)]?.length;

      if (savedMovedCount && savedMovedCount <= directions.length) {
        return res.status(400).json({
          error: 'Best checkpoint must have a lower move count',
        });
      }
    }

    const checkpoint = await KeyValueModel.findOneAndUpdate(
      { key: checkpointKey },
      {
        $set: { [`value.${index}`]: directions },
        gameId: level.gameId,
      },
      { upsert: true, new: true }
    );

    return res.status(200).json(checkpoint?.value);
  } else if (req.method === 'DELETE') {
    const { index } = req.query;

    /** findOneAndUpdate upsert this value... We need to be able set the specific index of the array the value of directions */
    const checkpoint = await KeyValueModel.findOneAndUpdate(
      { key: checkpointKey },
      {
        $unset: { [`value.${index}`]: '' },
        gameId: level.gameId,
      },
      { upsert: true, new: true }
    );

    return res.status(200).json(checkpoint?.value);
  }
});
