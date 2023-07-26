// run with ts-node -r tsconfig-paths/register --files server/scripts/convert-checkpoints.ts

import Direction, { getDirectionFromCode } from '@root/constants/direction';
import { CheckpointMove } from '@root/helpers/checkpointHelpers';
import cliProgress from 'cli-progress';
import dotenv from 'dotenv';
import dbConnect from '../../lib/dbConnect';
import { KeyValueModel } from '../../models/mongoose';

'use strict';

dotenv.config();
console.log('env vars are ', dotenv.config().parsed);

async function init() {
  console.log('Connecting to db...');
  await dbConnect();
  console.log('connected');

  const checkpoints = await KeyValueModel.countDocuments({ key: { $regex: 'checkpoints' } });
  let i = 0;

  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

  progressBar.start(checkpoints, i);

  for await (const kvm of KeyValueModel.find({ key: { $regex: 'checkpoints' } })) {
    for (const key of Object.keys(kvm.value)) {
      if (!kvm.value) {
        console.log(`\r${kvm.key} skipping undefined value`);
        continue;
      }

      const checkpoint = kvm.value[key];

      if (Array.isArray(checkpoint)) {
        console.log(`\r${kvm.key}[${key}] skipping array`);
        continue;
      }

      const directions = checkpoint.moves.map((move: CheckpointMove) => getDirectionFromCode(move.code));

      for (const direction of directions) {
        if (!(direction in Direction)) {
          console.log(`\r${kvm.key}[${key}] invalid direction ${direction}`);
          continue;
        }
      }

      kvm.value[key] = directions;
    }

    await KeyValueModel.updateOne({ _id: kvm._id }, { $set: { value: kvm.value } });

    i++;
    progressBar.update(i);
  }

  progressBar.stop();
  process.exit(0);
}

init();
