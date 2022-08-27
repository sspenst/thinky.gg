// run with ts-node --files server/scripts/save.ts
// import dotenv
import dotenv from 'dotenv';
import dbConnect from '../../lib/dbConnect';
import { LevelModel } from '../../models/mongoose';
import { calcPlayAttempts, refreshIndexCalcs } from '../../models/schemas/levelSchema';

dotenv.config();

async function integrityCheckLevels() {
  console.log('connecting to db...');
  await dbConnect();
  console.log('connected');
  const allLevels = await LevelModel.find({}, {}, { lean: false });

  console.log('Starting integrity checks');

  for (let i = 0; i < allLevels.length; i++) {
    const before = allLevels[i];

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

      if (before[key]?.toString() !== after[key]?.toString()) {
        changed.push({ key: key, before: before[key], after: after[key] });
      }
    }

    if (changed.length > 0) {
      console.warn(`${before.name} changed:`);

      for (const change of changed) {
        console.warn(`${change.key}: ${change.before} -> ${change.after}`);
      }
    }

    // show percent done of loop
    const percent = Math.floor((i / allLevels.length) * 100);

    if (i % 10 === 0) {
      console.log(`${percent}%`);
    }
  }

  console.log('100%');
  console.log('All done');
}

integrityCheckLevels();
