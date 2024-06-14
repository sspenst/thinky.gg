// ts-node -r tsconfig-paths/register --files server/scripts/restore-levels.ts

import { Games } from '@root/constants/Games';
import TestId from '@root/constants/testId';
import { generateLevelSlug } from '@root/helpers/generateSlug';
import { TimerUtil } from '@root/helpers/getTs';
import Level from '@root/models/db/level';
import { calcCreatorCounts } from '@root/models/schemas/userSchema';
import dotenv from 'dotenv';
import { Types } from 'mongoose';
import dbConnect from '../../lib/dbConnect';
import { LevelModel, PlayAttemptModel, RecordModel, ReviewModel, StatModel, UserConfigModel, UserModel } from '../../models/mongoose';

'use strict';

dotenv.config();
console.log('loaded env vars');

async function init() {
  // const args = process.argv.slice(2);

  console.log('connecting to db...');
  await dbConnect();
  console.log('connected');

  const user = await UserModel.findOne({ name: 'Credits' }, { _id: 1 });

  for await (const level of LevelModel.find<Level>({ isDeleted: true, userId: user._id })) {
    // archive the deleted levels
    const slug = await generateLevelSlug(level.gameId, 'archive', level.name, level._id.toString());

    await LevelModel.updateOne({ _id: level._id }, {
      $set: {
        archivedBy: level.userId,
        archivedTs: TimerUtil.getTs(),
        slug: slug,
        userId: new Types.ObjectId(TestId.ARCHIVE),
      },
      $unset: { isDeleted: '' },
    });

    await PlayAttemptModel.updateMany({ levelId: level._id }, { $unset: { isDeleted: '' } });
    await RecordModel.updateMany({ levelId: level._id }, { $unset: { isDeleted: '' } });
    await ReviewModel.updateMany({ levelId: level._id }, { $unset: { isDeleted: '' } });

    const stats = await StatModel.find({ levelId: level._id });
    const userIdsSolved = [];
    const userIdsCompleted = [];

    for (const stat of stats) {
      if (stat.complete) {
        userIdsSolved.push(stat.userId);
      } else {
        userIdsCompleted.push(stat.userId);
      }
    }

    console.log(level._id.toString(), level.name, slug, userIdsSolved.length, userIdsCompleted.length);

    await StatModel.updateMany({ levelId: level._id }, { $unset: { isDeleted: '' } });
    await UserConfigModel.updateMany({ userId: { $in: userIdsSolved }, gameId: level.gameId }, { $inc: { calcLevelsSolvedCount: 1, calcLevelsCompletedCount: 1 } });
    await UserConfigModel.updateMany({ userId: { $in: userIdsCompleted }, gameId: level.gameId }, { $inc: { calcLevelsCompletedCount: 1 } });
  }

  await Promise.all([Object.values(Games).map(game => calcCreatorCounts(game.id, new Types.ObjectId(TestId.ARCHIVE)))]);

  process.exit(0);
}

init();
