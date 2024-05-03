// run with ts-node --files server/scripts/backfill-slugs.ts
// import dotenv
import Collection from '@root/models/db/collection';
import cliProgress from 'cli-progress';
import dotenv from 'dotenv';
import { generateCollectionSlug } from '../../helpers/generateSlug';
import dbConnect, { dbDisconnect } from '../../lib/dbConnect';
import { CollectionModel } from '../../models/mongoose';

dotenv.config();

const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
const args = process.argv.slice(2);
const URL_HOST = args[0] || 'http://localhost:3000';

// Only does collection slugs at the moment
async function startBackfillCollectionSlugs() {
  await dbConnect();
  // select all collections with no slugs
  const collections = await CollectionModel.find({ slug: { $exists: false }, }, { _id: 1, name: 1, userId: 1, gameId: 1 }).populate('userId').lean<Collection[]>();

  // loop through all the collections and generate a slug
  progressBar.start(collections.length, 0);

  for (let i = 0; i < collections.length; i++) {
    const collection = collections[i];
    let username = collection?.userId?.name;

    // generate a slug
    if (!username) {
      username = 'pathology';
    }

    const slug = await generateCollectionSlug(collection.gameId, username, collection.name, collection._id.toString());

    // update the collection
    await CollectionModel.updateOne({ _id: collection._id }, { slug: slug });
    progressBar.update(i);
  }

  progressBar.update(collections.length);
  progressBar.stop();
  console.log('Finished');

  console.log('Starting smoke test');

  const allCollections = await CollectionModel.find({}, 'slug name').lean<Collection[]>();

  progressBar.start(allCollections.length, 0);
  let error = false;

  for (let i = 0; i < allCollections.length; i++) {
    const url = `${URL_HOST}/collection/${allCollections[i].slug}`;
    const name = allCollections[i].name;
    const res = await fetch(url);

    progressBar.update(i);

    if (res.status !== 200) {
      console.error(`\nError: Page [${url}] for '[${name}] failed with status code ${res.status}`);
      error = true;
    }
  }

  progressBar.update(allCollections.length);
  progressBar.stop();
  await dbDisconnect();

  if (error) {
    console.error('\nExiting status code 1');
    process.exit(1);
  } else {
    console.log('\nWoohoo!\n\nSuccessfully completed collection smoke tests.\nExiting with status code 0');
    process.exit(0);
  }
}

startBackfillCollectionSlugs();
