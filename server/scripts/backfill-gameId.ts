// run with ts-node -r tsconfig-paths/register --files server/scripts/backfill-gameId.ts
// import dotenv
import { GameId } from '@root/constants/GameId';
import cliProgress from 'cli-progress';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import dbConnect, { dbDisconnect } from '../../lib/dbConnect';

dotenv.config();

const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
const args = process.argv.slice(2);
const URL_HOST = args[0] || 'http://localhost:3000';

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
    const collectionInfo = await mongoose.connection.db.collection(collectionName).findOne({ gameId: { $exists: true } });

    if (collectionInfo) {
      collectionsWithGameIdField.push(collectionName);
    }

    progressBar.update(i);
  }

  progressBar.update(allMongoDBCollections.length);

  console.log('Starting backfill on ', collectionsWithGameIdField.join('\n'), ' collections');
  progressBar.start(collectionsWithGameIdField.length, 0);

  for (let i = 0; i < collectionsWithGameIdField.length; i++) {
    // update the gameId field to be the correct gameId
    const collectionName = collectionsWithGameIdField[i];

    await mongoose.connection.db.collection(collectionName).updateMany({}, { $set: { gameId: GameId.PATHOLOGY } });
    progressBar.update(i);
  }

  progressBar.update(collectionsWithGameIdField.length);
  console.log('Finished');
  await dbDisconnect();
  process.exit(0);
}

backfillGameId();
