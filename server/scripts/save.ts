import { LevelModel } from '../../models/mongoose';

export async function integrityCheckLevels() {
  const allLevels = await LevelModel.find({});

  for (let i = 0; i < allLevels.length; i++) {
    const before = allLevels[i];

    allLevels[i].save();

    const after = await LevelModel.findById(allLevels[i]._id);

    // compare each key and value and see if any are different, if so, console log that
    const changed = [];

    for (const key in before) {

      if (before[key]?.toString() !== after[key]?.toString()) {
        changed.push({ key: key, before: before[key], after: after[key] });
      }
    }

    if (changed.length > 0) {
      console.log(`${before.name} changed:`);

      for (const change of changed) {
        console.log(`${change.key}: ${change.before} -> ${change.after}`);
      }
    }

    // show percent done of loop
    const percent = Math.floor((i / allLevels.length) * 100);

    if (i % 10 === 0) {
      console.log(`${percent}%`);
    }
  }

}
