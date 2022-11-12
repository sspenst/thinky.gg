// run with ts-node --files server/scripts/save.ts
// import dotenv
import dotenv from 'dotenv';
import dbConnect from '../../lib/dbConnect';
import { LevelModel, PlayAttemptModel, ReviewModel, StatModel, UserModel } from '../../models/mongoose';

dotenv.config();

async function toInt() {
  console.log('connecting to db...');
  await dbConnect();
  console.log('connected');
  let startBenchmark = Date.now();
  // convert ts to int
  const updateManyUsers = await UserModel.find({ ts: { $exists: true } });
  let promises = [];
  let updated = 0;

  for (const user of updateManyUsers) {
    // check if user.ts is an int
    if (!Number.isInteger(user.ts) || (user.last_visited_at !== undefined && !Number.isInteger(user.last_visited_at))) {
      user.ts = parseInt(user.ts);

      if (user.last_visited_at !== undefined) {
        user.last_visited_at = parseInt(user.last_visited_at);
      }

      promises.push(user.save());
      updated++;
    }
  }

  await Promise.all(promises);

  console.log('Updated ' + updated + ' users in ' + (Date.now() - startBenchmark) + 'ms');

  const levels = await LevelModel.find({ ts: { $exists: true } });

  promises = [];
  startBenchmark = Date.now();

  for (const level of levels) {
    if (!Number.isInteger(level.ts)) {
      level.ts = parseInt(level.ts);
      promises.push(level.save());
    }
  }

  await Promise.all(promises);
  console.log('Updated ' + promises.length + ' levels in ' + (Date.now() - startBenchmark) + 'ms');

  const reviews = await ReviewModel.find({ ts: { $exists: true } });

  promises = [];
  startBenchmark = Date.now();

  for (const review of reviews) {
    if (!Number.isInteger(review.ts)) {
      review.ts = parseInt(review.ts);
      promises.push(review.save());
    }
  }

  await Promise.all(promises);
  console.log('Updated ' + promises.length + ' reviews in ' + (Date.now() - startBenchmark) + 'ms');

  const playAttempts = await PlayAttemptModel.find({ endTime: { $exists: true } });

  promises = [];
  startBenchmark = Date.now();

  for (const playAttempt of playAttempts) {
    if (!Number.isInteger(playAttempt.endTime) || !Number.isInteger(playAttempt.startTime)) {
      playAttempt.endTime = parseInt(playAttempt.endTime);
      playAttempt.startTime = parseInt(playAttempt.startTime);
      promises.push(playAttempt.save());
    }
  }

  await Promise.all(promises);
  console.log('Updated ' + promises.length + ' playAttempts in ' + (Date.now() - startBenchmark) + 'ms');

  process.exit(0);
}

toInt();
