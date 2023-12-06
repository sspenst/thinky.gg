// run with ts-node -r tsconfig-paths/register --files server/scripts/backfill-gameId.ts
// import dotenv
import { GameId } from '@root/constants/GameId';
// import * as models from '@root/models/mongoose';
import cliProgress from 'cli-progress';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import * as readline from 'readline';
import dbConnect, { dbDisconnect } from '../../lib/dbConnect';

dotenv.config();

const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

/**
 * backfill gameId field for all collections that have a gameId field
 * note that any other gameIds will be overwritten with the gameId passed in
 */
async function backfillGameId(gameId: GameId = GameId.PATHOLOGY) {
  await dbConnect();

  const modelsWithInvalidGameIds = [];
  const allMongoDBModels = Object.keys(mongoose.models);

  progressBar.start(allMongoDBModels.length, 0);

  for (let i = 0; i < allMongoDBModels.length; i++) {
    progressBar.increment();

    // check which collections have a gameId field
    const model = mongoose.models[allMongoDBModels[i]];
    const hasGameId = model.schema.paths.gameId ? true : false;

    if (!hasGameId) {
      continue;
    }

    const countInvalidGameIds = await model.countDocuments({
      gameId: { $ne: gameId }
    });

    if (countInvalidGameIds > 0) {
      modelsWithInvalidGameIds.push([model, countInvalidGameIds]);
    }
  }

  progressBar.stop();

  console.log('Starting backfill on ', modelsWithInvalidGameIds.length, ' collections');

  progressBar.start(modelsWithInvalidGameIds.length, 0);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  for (let i = 0; i < modelsWithInvalidGameIds.length; i++) {
    const [model, countInvalidGameIds] = modelsWithInvalidGameIds[i] as [mongoose.Model<mongoose.Document>, number];

    console.log('\nConfirm you want to update gameId field for collection: ', model.modelName, '(' + countInvalidGameIds + ' rows) (y/n): ');

    if (await new Promise((resolve) => {
      rl.question('', (answer) => {
        resolve(answer === 'y');
      });
    }) === false) {
      console.log('Skipping collection: ', model.modelName);
      progressBar.increment();
      continue;
    }

    await model.updateMany(
      { gameId: { $ne: gameId } },
      { $set: { gameId: gameId } },
    );
    progressBar.increment();
  }

  progressBar.stop();

  console.log('Finished');
  await dbDisconnect();
  process.exit(0);
}

backfillGameId();
