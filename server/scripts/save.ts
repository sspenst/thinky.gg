// run with ts-node --files server/scripts/save.ts
// import dotenv
import cliProgress from 'cli-progress';
import dotenv from 'dotenv';
import dbConnect from '../../lib/dbConnect';
import { LevelModel, StatModel, UserModel } from '../../models/mongoose';
import { calcPlayAttempts, refreshIndexCalcs } from '../../models/schemas/levelSchema';

dotenv.config();
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

async function integrityCheckLevels() {
  console.log('connecting to db...');
  await dbConnect();
  console.log('connected');
  const allLevels = await LevelModel.find({ isDraft: false }, '_id', { lean: false, sort: { ts: -1 } });

  console.log('Starting integrity checks Levels');
  progressBar.start(allLevels.length, 0);

  for (let i = 180; i < allLevels.length; i++) {
    const beforeId = allLevels[i];
    const before = await LevelModel.findById(beforeId);

    try {
      await calcPlayAttempts(allLevels[i]);
      await refreshIndexCalcs(allLevels[i]);
    } catch (e){
      console.error(e, 'for ', before.name);
    }

    const after = await LevelModel.findById(allLevels[i]._id);

    // compare each key and value and see if any are different, if so, console log that
    const changed = [];

    for (const key in before) {
      if (key === '__v') {
        continue;
      }

      // check if before[key] is array
      if (before[key] instanceof Array) {
        // an array so we need to check if the sorted values are differend
        const beforeArr = before[key].sort();
        const afterArr = after[key].sort();
        const arraysEqual = beforeArr.length === afterArr.length && beforeArr.every((value: any, index: any) => value.toString() === afterArr[index].toString());

        if (!arraysEqual) {
          changed.push({ key: key, before: beforeArr, after: afterArr });
          continue;
        }
      }
      else if (before[key]?.toString() !== after[key]?.toString()) {
        changed.push({ key: key, before: before[key], after: after[key] });
      }
    }

    if (changed.length > 0) {
      console.warn(`\n${before.name} changed:`);

      for (const change of changed) {
        if (change.key === 'calc_playattempts_unique_users') {
          const before = change.before.map((x: any) => x.toString());
          const after = change.after.map((x: any) => x.toString());
          const diffAdded = after.filter((x: any) => !before.includes(x));
          const diffRemoved = before.filter((x: any) => !after.includes(x));

          console.warn(`calc_playattempts_unique_users changed by adding ${diffAdded} added and removing ${diffRemoved} removed`);
        } else {
          console.warn(`${change.key}: ${change.before} -> ${change.after}`);
        }
      }
    }

    // show percent done of loop
    const percent = Math.floor((i / allLevels.length) * 100);

    progressBar.update(i);
  }

  progressBar.update(allLevels.length);
  progressBar.stop();

  console.log('All done');
}

async function integrityCheckUsersScore() {
  console.log('connecting to db...');
  await dbConnect();
  console.log('connected');

  // Aggregate all of the stat model complete:true by userId
  const scoreTable = await StatModel.aggregate([
    { $match: { complete: true } },
    { $group: { _id: '$userId', count: { $sum: 1 } } },
  ]);

  // now update all user's  based on their play attempt count
  console.log('Querying all users into memory...');
  const allUsers = await UserModel.find({}, '_id name score', { lean: false, sort: { ts: -1 } });
  let i = 0;

  progressBar.start(allUsers.length, 0);

  for (const user of allUsers) {
    const scoreForThisUser = scoreTable.find((x: any) => x._id.toString() === user._id.toString())?.count || 0;

    const userBefore = await UserModel.findOneAndUpdate({ _id: user._id }, { $set: { score: scoreForThisUser } }, { new: false });

    if (user.score !== scoreForThisUser) {
      console.warn(`User ${user.name} score changed from ${userBefore.score} to ${scoreForThisUser}`);
    }

    i++;
    progressBar.update(i);
  }
}

integrityCheckLevels();
//integrityCheckUsersScore();
