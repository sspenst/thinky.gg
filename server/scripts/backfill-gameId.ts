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
    const collectionInfo = await mongoose.connection.db.collection(collectionName).findOne({
      // where gameId exists and is not the correct gameId
      gameId: { $exists: true, $ne: GameId.PATHOLOGY }
    });

    if (collectionInfo) {
      collectionsWithGameIdField.push(collectionName);
    }

    progressBar.update(i);
  }

  progressBar.update(allMongoDBCollections.length);

  console.log('Starting backfill on ', collectionsWithGameIdField.join('\n'), ' collections');
  progressBar.start(collectionsWithGameIdField.length, 0);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  for (let i = 0; i < collectionsWithGameIdField.length; i++) {
    // update the gameId field to be the correct gameId
    const collectionName = collectionsWithGameIdField[i];

    console.log('\nConfirm you want to update gameId field for collection: ', collectionName, ' (y/n): ');

    if (await new Promise((resolve) => {
      rl.question('', (answer) => {
        resolve(answer === 'y');
      });
    }) === false) {
      console.log('\nSkipping collection: ', collectionName);
      continue;
    }

    await mongoose.connection.db.collection(collectionName).updateMany({
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
