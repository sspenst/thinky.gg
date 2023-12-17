import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { rawDbConnect, rawDbDisconnect } from './rawDbconnect';

/**
 * Migrates specified fields from one collection to another.
 *
 * @param {mongoose.Model} sourceModel - The source Mongoose model.
 * @param {mongoose.Model} targetModel - The target Mongoose model.
 * @param {Object} fieldsToMigrate - Object mapping source field names to target field names.
 */
export async function migrateFields(sourceModel: any, targetModel: any, fieldsToMigrate: any, localField: string, foreignField: string, matchQuery: any = {}) {
  console.log('Starting the database connection...');
  const conn = await rawDbConnect();

  console.log('Database connected.');

  console.log('Starting the aggregation pipeline...');
  console.log('Migrating the fields \'' + Object.keys(fieldsToMigrate).join(', ') + '\' from the \'' + sourceModel.collection.name + '\' collection to the \'' + targetModel.collection.name + '\' collection.');
  const startTime = Date.now();

  const pipelinePrev = [
    { $match: {} }, // Adjust this match condition if needed
    {
      $lookup: {
        from: targetModel.collection.name,
        localField: localField, // This field might need to be adjusted based on your schema
        foreignField: foreignField,
        as: 'target'
      }
    },
    { $unwind: '$target' },
    { $match: matchQuery }, // Adjust this match condition if needed
    {
      $project: {
        _id: '$target._id',
        ...fieldsToMigrate
      }
    },
  ];

  const preview = await sourceModel.aggregate(pipelinePrev);

  console.log(preview.length + ' documents will be migrated.');

  const pipeline = [
    { $match: {} }, // Adjust this match condition if needed
    {
      $lookup: {
        from: targetModel.collection.name,
        localField: localField, // This field might need to be adjusted based on your schema
        foreignField: foreignField,
        as: 'target'
      }
    },
    { $unwind: '$target' },
    { $match: matchQuery }, // Adjust this match condition if needed
    {
      $project: {
        _id: '$target._id',
        ...fieldsToMigrate
      }
    },
    {
      $merge: {
        into: targetModel.collection.name,
        whenMatched: 'merge'
      }
    }
  ];

  await sourceModel.aggregate(pipeline);

  const timeTakenSeconds = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('Aggregation pipeline completed in ' + timeTakenSeconds + ' seconds.');

  console.log('Closing the database connection...');
  await rawDbDisconnect(conn);
  console.log('Database disconnected.');

  console.log('Migration completed successfully.');
}
