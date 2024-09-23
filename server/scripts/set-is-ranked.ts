// ts-node -r tsconfig-paths/register --files server/scripts/set-is-ranked.ts

import { GameId } from '@root/constants/GameId';
import { switchIsRanked } from '@root/pages/api/admin';
import cliProgress from 'cli-progress';
import dotenv from 'dotenv';
import * as fs from 'fs';
import { Types } from 'mongoose';
import dbConnect from '../../lib/dbConnect';

'use strict';

dotenv.config();
console.log('loaded env vars');
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

async function setIsRanked() {
  const filePath = './server/scripts/ranked-level-ids';

  fs.readFile(filePath, 'utf8', async (err: NodeJS.ErrnoException | null, data: string) => {
    if (err) {
      console.error('Error reading the file:', err);

      process.exit(0);
    }

    const levelIds = data.split('\n');

    progressBar.start(levelIds.length, 0);

    for (const levelId of levelIds) {
      await switchIsRanked(new Types.ObjectId(levelId as string), GameId.PATHOLOGY, true);
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
