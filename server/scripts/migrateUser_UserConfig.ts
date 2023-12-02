// run with
// ts-node -r tsconfig-paths/register --files server/scripts/migrateUser_UserConfig.ts
// import dotenv
import User from '@root/models/db/user';
import { UserConfigModel, UserModel } from '@root/models/mongoose';
import cliProgress from 'cli-progress';
import dotenv from 'dotenv';
import dbConnect, { dbDisconnect } from '../../lib/dbConnect';

dotenv.config();

const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

async function migrate() {
  // get all collections
  await dbConnect();

  const allUserConfigs = await UserConfigModel.find({}, { 'emailConfirmed': 1, 'emailConfirmationToken': 1, 'userId': 1 }).lean();

  progressBar.start(allUserConfigs.length, 0);

  // loop through all userConfigs and update UserModel.emailConfirmed to equal it
  for (let i = 0; i < allUserConfigs.length; i++) {
    const userConfig = allUserConfigs[i];

    if (userConfig.emailConfirmed === undefined || userConfig.emailConfirmationToken === undefined) {
      //console.warn(`\nuserConfig.emailConfirmed is undefined for userConfig ${userConfig._id}`, userConfig);

      continue;
    }

    const updated = await UserModel.findOneAndUpdate<User>({ _id: userConfig.userId }, {
      emailConfirmed: userConfig.emailConfirmed,
      emailConfirmationToken: userConfig.emailConfirmationToken,
    }, { new: true, projection: { 'emailConfirmed': 1, 'emailConfirmationToken': 1, 'userId': 1 } }).lean();

    // double check that it worked, if so, remove emailConfirmed from UserConfig
    //console.log('updated', updated, 'vs', userConfig, updated && updated.emailConfirmed === userConfig.emailConfirmed && updated.emailConfirmationToken === userConfig.emailConfirmationToken);

    if (updated && updated.emailConfirmed === userConfig.emailConfirmed && updated.emailConfirmationToken === userConfig.emailConfirmationToken) {
      const n = await UserConfigModel.findOneAndUpdate({ _id: userConfig._id }, {
        $unset: {
          emailConfirmed: 1,
          emailConfirmationToken: 1,
        },
      }, { new: true, projection: { 'emailConfirmed': 1, 'emailConfirmationToken': 1, 'userId': 1 } }).lean();

      console.log(n);
    }

    progressBar.update(i);
  }

  progressBar.update(allUserConfigs.length);
  progressBar.stop();

  await dbDisconnect();

  console.log('Done!');
}

migrate();
