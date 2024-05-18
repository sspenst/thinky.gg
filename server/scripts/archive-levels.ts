// ts-node -r tsconfig-paths/register --files server/scripts/archive-levels.ts

import { Games } from '@root/constants/Games';
import TestId from '@root/constants/testId';
import { generateLevelSlug } from '@root/helpers/generateSlug';
import { TimerUtil } from '@root/helpers/getTs';
import Level from '@root/models/db/level';
import { calcCreatorCounts } from '@root/models/schemas/userSchema';
import dotenv from 'dotenv';
import { Types } from 'mongoose';
import dbConnect from '../../lib/dbConnect';
import { LevelModel, UserModel } from '../../models/mongoose';

'use strict';

dotenv.config();
console.log('loaded env vars');

async function init() {
  // const args = process.argv.slice(2);

  console.log('connecting to db...');
  await dbConnect();
  console.log('connected');

  const userIds = new Set<string>();

  for await (const user of UserModel.find({})) {
    userIds.add(user._id.toString());
  }

  for await (const level of LevelModel.find<Level>({ isDeleted: { $ne: true } })) {
    // archive all levels that were supposed to be archived (the user is deleted)
    if (!userIds.has(level.userId.toString())) {
      const slug = await generateLevelSlug(level.gameId, 'archive', level.name, level._id.toString());

      console.log(level._id.toString(), slug);

      await LevelModel.updateOne({ _id: level._id }, { $set: {
        userId: new Types.ObjectId(TestId.ARCHIVE),
        archivedBy: level.userId,
        archivedTs: TimerUtil.getTs(),
        slug: slug,
      } });
    }
  }

  await Promise.all([Object.values(Games).map(game => calcCreatorCounts(game.id, new Types.ObjectId(TestId.ARCHIVE)))]);

  process.exit(0);
}

init();
