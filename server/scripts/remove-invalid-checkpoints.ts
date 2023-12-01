// this script is now outdated
// run with ts-node -r tsconfig-paths/register --files server/scripts/remove-invalid-checkpoints.ts

import { directionsToGameState, getCheckpointKey } from '@root/helpers/checkpointHelpers';
import cliProgress from 'cli-progress';
import dotenv from 'dotenv';
import { Types } from 'mongoose';
import dbConnect from '../../lib/dbConnect';
import { KeyValueModel, LevelModel } from '../../models/mongoose';

'use strict';

dotenv.config();
console.log('env vars are ', dotenv.config().parsed);

async function init() {
  console.log('Connecting to db...');
  await dbConnect();
  console.log('connected');

  const checkpoints = await KeyValueModel.countDocuments({ key: { $regex: 'checkpoints' } });
  const levelData: { [id: string]: string } = {};
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  let i = 0;

  progressBar.start(checkpoints, i);

  for await (const kvm of KeyValueModel.find({ key: { $regex: 'checkpoints' } })) {
    if (!kvm.value) {
      console.log(`\r${kvm.key} skipping undefined value`);
      continue;
    }

    const [userId, levelId] = kvm.key.split('_');

    if (!(levelId in levelData)) {
      const level = await LevelModel.findById(new Types.ObjectId(levelId), 'data');

      if (!level) {
        console.log(`\r${kvm.key} level ${levelId} not found`);
        continue;
      }

      levelData[levelId] = level.data;
    }

    for (const key of Object.keys(kvm.value)) {
      if (!directionsToGameState(kvm.value[key], levelData[levelId])) {
        console.log(`\r${kvm.key}[${key}] invalid checkpoint`);

        await KeyValueModel.findOneAndUpdate(
          // GameId should not be needed for this part of the script...
          { key: getCheckpointKey(levelId, userId) },
          { $unset: { [`value.${key}`]: '' } },
        );
      }
    }

    i++;
    progressBar.update(i);
  }

  progressBar.stop();
  process.exit(0);
}

init();
