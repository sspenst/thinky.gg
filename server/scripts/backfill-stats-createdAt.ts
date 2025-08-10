// ts-node -r tsconfig-paths/register --files server/scripts/backfill-stats-createdAt.ts
import dbConnect from '@root/lib/dbConnect';
import { StatModel } from '@root/models/mongoose';
import cliProgress from 'cli-progress';
import dotenv from 'dotenv';

dotenv.config();
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

async function Go() {
  await dbConnect();
  // grab all stats where createdAt is undefined
  const statsWithUndefinedCreatedAt = await StatModel.countDocuments({ createdAt: { $exists: false } });

  const start = Date.now();

  console.log('Number to migrate', statsWithUndefinedCreatedAt);
  progressBar.start(statsWithUndefinedCreatedAt, 0);
  const perBatch = Math.ceil(statsWithUndefinedCreatedAt / 50);

  for (let i = 0; i < 50; i++) {
    await StatModel.aggregate([
      { $match: { createdAt: { $exists: false } } },
      { $limit: perBatch },
      { $addFields: { createdAt: { $toDate: '$_id' } } },
      { $merge: { into: StatModel.collection.name, whenMatched: 'merge' } }
    ]);
    progressBar.increment(perBatch);
  }

  progressBar.update(30);
  progressBar.stop();
  const durationM = (Date.now() - start) / 1000 / 60;

  console.log(`\nDone! Duration: ${durationM.toFixed(2)} minutes`);
}

console.log('Starting backfill stats createdAt script');
Go();
