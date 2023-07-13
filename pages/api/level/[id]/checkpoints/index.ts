import { GameState } from '@root/components/level/game';
import { NextApiResponse } from 'next';
import { ValidGameState, ValidNumber } from '../../../../../helpers/apiWrapper';
import isPro from '../../../../../helpers/isPro';
import withAuth, { NextApiRequestWithAuth } from '../../../../../lib/withAuth';
import { KeyValueModel, LevelModel } from '../../../../../models/mongoose';

export default withAuth({
  GET: {},
  POST: {
    body: {
      checkpointIndex: ValidNumber(true, 0, 10),
      checkpointValue: ValidGameState(),
    }
  },
  DELETE: {
    body: {
      checkpointIndex: ValidNumber(true, 0, 10),
      checkpointValue: ValidGameState(),
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
    const { checkpointIndex, checkpointValue } = req.body as { checkpointIndex: number, checkpointValue: GameState };

    if (checkpointIndex === 10) {
      const existingCheckpoints = await KeyValueModel.findOne(
        { key: KV_Checkpoint_Hash },
      );

      if (existingCheckpoints?.value['10'] && existingCheckpoints.value['10'].moveCount >= checkpointValue.moveCount) {
        return res.status(400).json({
          error: 'Cannot overwrite a lower move count',
        });
      }
    }

    /** findOneAndUpdate upsert this value... We need to be able set the specific index of the array the value of checkpointValue */
    const checkpoint = await KeyValueModel.findOneAndUpdate(
      { key: KV_Checkpoint_Hash },
      { $set: { [`value.${checkpointIndex}`]: checkpointValue } },
      { upsert: true, new: true }
    );

    return res.status(200).json(checkpoint?.value);
  } else if (req.method === 'DELETE') {
    const { checkpointIndex, checkpointValue } = req.body as { checkpointIndex: number, checkpointValue: GameState };

    // make sure the level exists

    /** findOneAndUpdate upsert this value... We need to be able set the specific index of the array the value of checkpointValue */
    const checkpoint = await KeyValueModel.findOneAndUpdate(
      { key: KV_Checkpoint_Hash },
      { $unset: { [`value.${checkpointIndex}`]: checkpointValue } },
      { upsert: true, new: true }
    );

    return res.status(200).json(checkpoint?.value);
  }
});
