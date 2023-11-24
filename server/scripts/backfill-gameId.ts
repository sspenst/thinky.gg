// run with ts-node -r tsconfig-paths/register --files server/scripts/backfill-gameId.ts
// import dotenv
import { GameId } from '@root/constants/GameId';
import cliProgress from 'cli-progress';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import * as readline from 'readline';
import dbConnect, { dbDisconnect } from '../../lib/dbConnect';

dotenv.config();

const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

async function backfillGameId() {
  // get all collections
  await dbConnect();

  const allMongoDBCollections = await mongoose.connection.db.listCollections().toArray();
  const collectionsWithGameIdField = [];

  progressBar.start(allMongoDBCollections.length, 0);

  for (let i = 0; i < allMongoDBCollections.length; i++) {
    // check which collections have a gameId field
    const collection = allMongoDBCollections[i];
    const collectionName = collection.name;

    const countWithGameId = await mongoose.connection.db.collection(collectionName).countDocuments({
      gameId: { $exists: true }
    });

    if (countWithGameId === 0) {
      progressBar.update(i);
      continue;
    }

    const countWithNullGameId = await mongoose.connection.db.collection(collectionName).countDocuments({
      gameId: { $eq: null }
    });

    if (countWithGameId > 0 && countWithNullGameId > 0) {
      collectionsWithGameIdField.push([collectionName, countWithNullGameId]);
    }

    progressBar.update(i);
  }

  console.log('\nStarting backfill on ', collectionsWithGameIdField.length, ' collections');
  progressBar.update(allMongoDBCollections.length);

  progressBar.start(collectionsWithGameIdField.length, 0);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  for (let i = 0; i < collectionsWithGameIdField.length; i++) {
    // update the gameId field to be the correct gameId
    const [collectionName, toUpdate] = collectionsWithGameIdField[i];

    console.log('\nConfirm you want to update gameId field for collection: ', collectionName, '(' + toUpdate + ' rows) (y/n): ');

    if (await new Promise((resolve) => {
      rl.question('', (answer) => {
        resolve(answer === 'y');
      });
    }) === false) {
      console.log('\nSkipping collection: ', collectionName);
      continue;
    }

    await mongoose.connection.db.collection(collectionName as string).updateMany({
      // where gameId is not the correct gameId
      gameId: { $ne: GameId.PATHOLOGY }
    }, { $set: { gameId: GameId.PATHOLOGY } });
    progressBar.update(i);
  }

  progressBar.update(collectionsWithGameIdField.length);
  console.log('\nFinished');
  await dbDisconnect();
  process.exit(0);
}

backfillGameId();
