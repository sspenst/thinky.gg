// run with ts-node --files server/scripts/save.ts
// import dotenv
import dotenv from 'dotenv';
import { logger } from '../../helpers/logger';
import dbConnect from '../../lib/dbConnect';
import { LevelModel } from '../../models/mongoose';
import { calcPlayAttempts } from '../../models/schemas/levelSchema';

dotenv.config();

async function integrityCheckLevels() {
  logger.info('connecting to db...');
  await dbConnect();
  logger.info('connected');
  const allLevels = await LevelModel.find({}, {}, { lean: false });

  logger.info('Starting integrity checks');

  for (let i = 0; i < allLevels.length; i++) {
    const before = allLevels[i];

    try {
      await calcPlayAttempts(allLevels[i]);
      await allLevels[i].save();
    } catch (e){
      logger.info(e, 'for ', before.name);
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
      logger.info(`${before.name} changed:`);

      for (const change of changed) {
        logger.info(`${change.key}: ${change.before} -> ${change.after}`);
      }
    }

    // show percent done of loop
    const percent = Math.floor((i / allLevels.length) * 100);

    if (i % 10 === 0) {
      logger.info(`${percent}%`);
    }
  }

  logger.info('100%');
  logger.info('All done');
}

integrityCheckLevels();
