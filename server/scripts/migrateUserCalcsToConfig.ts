// run with
// ts-node -r tsconfig-paths/register --files server/scripts/migrateUserCalcsToConfig.ts
// import dotenv
import User from '@root/models/db/user';
import { MultiplayerMatchModel, MultiplayerProfileModel, UserConfigModel, UserModel } from '@root/models/mongoose';
import cliProgress from 'cli-progress';
import dotenv from 'dotenv';
import dbConnect, { dbDisconnect } from '../../lib/dbConnect';

dotenv.config();

const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

async function migrate() {
  // get all collections
  await dbConnect();

  const allUsers = await UserModel.find({
  }, { 'calcRankedSolves': 1, 'calc_levels_created_count': 1, 'calc_records': 1, 'chapterUnlocked': 1, 'score': 1 }).lean();

  progressBar.start(allUsers.length, 0);

  // loop through all userConfigs and update UserModel.emailConfirmed to equal it
  for (let i = 0; i < allUsers.length; i++) {
    const user = await UserModel.findById<User>(allUsers[i]._id, { 'calcRankedSolves': 1, 'calc_levels_created_count': 1, 'calc_records': 1, 'chapterUnlocked': 1, 'score': 1 }).lean();

    if (!user) {
      console.log('\nno user for user', allUsers[i]._id);
      continue;
    }

    const updated = await UserConfigModel.findOneAndUpdate({ userId: user._id,
      calcRankedSolves: { $exists: false },
      calcLevelsCreatedCount: { $exists: false },
      calcRecordsCount: { $exists: false },
      chapterUnlocked: { $exists: false },
      calcLevelsSolvedCount: { $exists: false },
    }, {
      calcRankedSolves: user.calcRankedSolves,
      calcLevelsCreatedCount: user.calc_levels_created_count,
      calcRecordsCount: user.calc_records,
      chapterUnlocked: user.chapterUnlocked,
      calcLevelsSolvedCount: user.score,
    });

    if (!updated) {
      console.log('\nno update for user', user._id);
    }

    progressBar.update(i);
  }

  progressBar.update(allUsers.length);
  progressBar.stop();

  await dbDisconnect();

  console.log('Done!');
}

migrate();
