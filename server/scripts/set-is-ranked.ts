// ts-node -r tsconfig-paths/register --files server/scripts/set-is-ranked.ts

import Level from '@root/models/db/level';
import { LevelModel } from '@root/models/mongoose';
import cliProgress from 'cli-progress';
import dotenv from 'dotenv';
import * as fs from 'fs';
import dbConnect from '../../lib/dbConnect';

'use strict';

dotenv.config();
console.log('loaded env vars');
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

async function setIsRanked() {
  const filePath = './server/scripts/ranked_level_ids';

  fs.readFile(filePath, 'utf8', async (err: NodeJS.ErrnoException | null, data: string) => {
    if (err) {
      console.error('Error reading the file:', err);

      process.exit(0);
    }

    const rankedLevelIds = new Set(data.split('\n'));

    const totalLevels = await LevelModel.countDocuments();

    progressBar.start(totalLevels, 0);

    for await (const level of LevelModel.find<Level>()) {
      const isRanked = rankedLevelIds.has(level._id.toString());

      await LevelModel.updateOne({ _id: level._id }, { $set: { isRanked } });
      progressBar.increment();
    }

    progressBar.stop();

    process.exit(0);
  });
}

async function init() {
  console.log('connecting to db...');
  await dbConnect();
  console.log('connected');

  setIsRanked();
}

init();
