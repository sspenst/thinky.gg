// run with ts-node --files server/scripts/save.ts
// import dotenv
import cliProgress from 'cli-progress';
import dotenv from 'dotenv';
import dbConnect from '../../lib/dbConnect';
import { LevelModel, UserModel } from '../../models/mongoose';
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

async function integrityCheckUsers() {
  console.log('connecting to db...');
  await dbConnect();
  console.log('connected');
  const allLevels = await UserModel.find({ }, {}, { lean: false, sort: { ts: -1 } });

  console.log('Starting integrity checks for Users');
  progressBar.start(allLevels.length, 0);
}

integrityCheckLevels();
//integrityCheckUsers();
