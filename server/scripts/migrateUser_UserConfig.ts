// run with
// ts-node -r tsconfig-paths/register --files server/scripts/migrateUser_UserConfig.ts
// import dotenv
import { UserConfigModel, UserModel } from '@root/models/mongoose';
import cliProgress from 'cli-progress';
import dotenv from 'dotenv';
import dbConnect, { dbDisconnect } from '../../lib/dbConnect';

dotenv.config();

const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

async function migrate() {
  // get all collections
  await dbConnect();

  const allUserConfigs = await UserConfigModel.find({
  }, { 'emailConfirmed': 1, 'userId': 1 }).lean();

  progressBar.start(allUserConfigs.length, 0);

  // loop through all userConfigs and update UserModel.emailConfirmed to equal it
  for (let i = 0; i < allUserConfigs.length; i++) {
    const userConfig = allUserConfigs[i];

    await UserModel.updateOne({ _id: userConfig.userId,
    // where emailConfirmed doesn't exist
      emailConfirmed: { $exists: false }
    }, {
      emailConfirmed: userConfig.emailConfirmed,
    });
    progressBar.update(i);
  }

  progressBar.update(allUserConfigs.length);
  progressBar.stop();

  await dbDisconnect();

  console.log('Done!');
}

migrate();
