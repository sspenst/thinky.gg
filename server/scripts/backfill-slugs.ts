// run with ts-node --files server/scripts/backfill-slugs.ts
// import dotenv
import cliProgress from 'cli-progress';
import dotenv from 'dotenv';
import { generateCollectionSlug } from '../../helpers/generateSlug';
import { CollectionModel } from '../../models/mongoose';

dotenv.config();

const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

// Only does collection slugs at the moment
async function startBackfillCollectionSlugs() {
  // select all collections with no slugs
  const collections = await CollectionModel.find({ slug: { $exists: false } }, { _id: 1, name: 1, userId: 1 }, { lean: true }).populate('userId');

  // loop through all the collections and generate a slug
  progressBar.start(collections.length, 0);

  for (let i = 0; i < collections.length; i++) {
    const collection = collections[i];
    // generate a slug
    const slug = await generateCollectionSlug(collection.owner, collection.name, collection._id.toString());

    // update the collection
    await CollectionModel.updateOne({ _id: collection._id }, { slug: slug });
    progressBar.update(i);
  }

  progressBar.update(collections.length);
  progressBar.stop();
  console.log('Finished');
  // exit 0
  process.exit(0);
}

startBackfillCollectionSlugs();
