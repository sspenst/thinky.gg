// run with ts-node -r tsconfig-paths/register --files server/scripts/remove-self-reviews.ts

// import Level from '@root/models/db/level';
import Review from '@root/models/db/review';
import { queueRefreshIndexCalcs } from '@root/pages/api/internal-jobs/worker';
import cliProgress from 'cli-progress';
import dotenv from 'dotenv';
import dbConnect from '../../lib/dbConnect';
import { LevelModel, ReviewModel } from '../../models/mongoose';

'use strict';

dotenv.config();
console.log('env vars are ', dotenv.config().parsed);
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

async function removeSelfReviews() {
  const levelCount = await LevelModel.countDocuments({ isDeleted: { $ne: true }, isDraft: false });

  progressBar.start(levelCount, 0);

  // TODO: should we incorporate gameId here?
  for await (const level of LevelModel.find({ isDeleted: { $ne: true }, isDraft: false })) {
    const authorId = level.archivedBy ?? level.userId;
    const review = await ReviewModel.findOne<Review>({ levelId: level._id, userId: authorId });

    progressBar.increment();

    if (!review) {
      continue;
    }

    console.log(`\n${level.slug}`);

    if (!review.text) {
      await ReviewModel.deleteOne({ _id: review._id });
    } else {
      await ReviewModel.updateOne({ _id: review._id }, { $set: { score: 0 } });
    }

    await queueRefreshIndexCalcs(level._id);
  }

  progressBar.stop();
  console.log('All done');
}

async function init() {
  console.log('Connecting to db...');
  await dbConnect();
  console.log('connected');

  await removeSelfReviews();
}

init();
