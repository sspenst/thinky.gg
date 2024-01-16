// ts-node -r tsconfig-paths/register --files server/scripts/backfill-pathology-calcLevelsCompletedCount.ts
import { GameId } from '@root/constants/GameId';
import dbConnect from '@root/lib/dbConnect';
import { StatModel, UserConfigModel, UserModel } from '@root/models/mongoose';
import cliProgress from 'cli-progress';
import dotenv from 'dotenv';

dotenv.config();
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

async function Go() {
  // loop through all users
  await dbConnect();
  const totalUsers = await UserModel.countDocuments({ });

  progressBar.start(totalUsers, 0);
  const gameIdToUse = GameId.PATHOLOGY;

  for await (const user of UserModel.find({ })) {
    const count = await StatModel.countDocuments({ gameId: gameIdToUse, userId: user._id, isDeleted: { $ne: true } } );

    const newUserConfig = await UserConfigModel.findOneAndUpdate({
      userId: user._id,
      gameId: gameIdToUse,
      // also where calcLevelsCompletedCount is not equal to count
      calcLevelsCompletedCount: { $ne: count }
    }, {
      calcLevelsCompletedCount: count
    }, {
      new: true
    });

    if (newUserConfig) {
      console.log(`\nUpdated calcLevelsCompletedCount for ${user.name} to ${count}`);
    }

    progressBar.increment();
  }

  progressBar.stop();
  console.log('Done');
}

console.log('Starting backfill stats calcLevelsCompletedCount script');
Go();
