// ts-node -r tsconfig-paths/register --files server/scripts/p2_migrateEmailDigestToUser.ts
import { UserConfigModel, UserModel } from '@root/models/mongoose';
import dotenv from 'dotenv';
import dbConnect, { dbDisconnect } from '../../lib/dbConnect';

dotenv.config();

async function migrate() {
  console.log('Starting the database connection...');
  await dbConnect();
  console.log('Database connected.');

  console.log('Starting the aggregation pipeline...');
  const s = Date.now();

  await UserConfigModel.aggregate([
    {
      $match: {} // Match all documents or apply any filters if necessary
    },
    {
      $lookup: {
        from: UserModel.collection.name, // The collection name of UserModel in MongoDB
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    {
      $match: { 'user.emailDigest': { $exists: false } } // Only match users where emailDigest doesn't exist
    },
    {
      $project: {
        _id: '$user._id',
        emailDigest: '$emailDigest',
        disallowedEmailNotifications: '$disallowedEmailNotifications',
        disallowedPushNotifications: '$disallowedPushNotifications'
      }
    },
    {
      $merge: {
        into: UserModel.collection.name, // The collection name of UserModel in MongoDB
        whenMatched: 'merge'
      }
    }
  ]);
  const timeTaken = Date.now() - s;
  const timeTakenSeconds = (timeTaken / 1000).toFixed(2);

  console.log('Aggregation pipeline completed in ' + timeTakenSeconds + ' seconds.');

  console.log('Closing the database connection...');
  await dbDisconnect();
  console.log('Database disconnected.');

  console.log('Migration completed successfully.');
}

migrate();
