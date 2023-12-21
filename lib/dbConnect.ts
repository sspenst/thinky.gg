import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose, { ConnectOptions, Types } from 'mongoose';
import { logger } from '../helpers/logger';
import initializeLocalDb from './initializeLocalDb';
import { wsConnect, wsDisconnect } from './wsConnect';

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.db;

if (!cached) {
  cached = global.db = {
    conn: null,
    mongoMemoryServer: null,
    promise: null,
  };
}

interface DBConnectProperties {
  ignoreInitializeLocalDb?: boolean;
}

export default async function dbConnect({ ignoreInitializeLocalDb }: DBConnectProperties = {}) {
  if (cached.conn) {
    /* istanbul ignore next */
    if (mongoose.connection.readyState !== 1) {
      logger.error('Mongoose connection error ' + mongoose.connection.readyState);
    }

    return cached.conn;
  }

  if (!cached.promise) {
    const options: ConnectOptions = {

      connectTimeoutMS: 10000,
      heartbeatFrequencyMS: 30000,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 20000,
    };

    let uri = undefined;

    /* istanbul ignore else */
    if (process.env.NODE_ENV === 'test' || !process.env.MONGODB_URI) {
      // create with replica
      if (!process.env.MONGODB_TEST_URI) {
        const replSetOptions = {
          replSet: {
            count: 1, // Number of instances in the replica set
            // storageEngine: 'inMemory', // Use the in-memory storage engine
            oplogSize: 10, // Smaller oplog size in MB
            args: [
              '--nojournal', // Disable journaling for speed
              //'--noprealloc', // Avoid file preallocation
              //'--smallfiles', // Use small files to save disk space (if applicable)
              '--syncdelay', '0' // Disable periodic flushing
            ],
            instanceOpts: [
              {
                storageEngine: 'inMemory', // Ensure each instance uses in-memory storage
                //socketTimeoutMS: 5000, // Reduce socket timeout
                //connectTimeoutMS: 5000, // Reduce connection timeout
                // Other options specific to instances can be set here
              },
            ],
          },
        };

        cached.mongoMemoryServer = await MongoMemoryReplSet.create(replSetOptions);
        uri = cached.mongoMemoryServer.getUri();
      } else {
        uri = process.env.MONGODB_TEST_URI;
        // now set the uri to point to a randomally generated database name
        // this is so that we can run tests in parallel
        const randomDbName = 'test_' + new Types.ObjectId().toString();

        uri = uri.replace('/?', '/' + randomDbName + '?');
      }
    } else {
      uri = process.env.MONGODB_URI;
    }

    cached.promise = mongoose.connect(uri, options).then((mongoose) => {
      return mongoose;
    });
  }

  cached.conn = await cached.promise;

  /* istanbul ignore next */
  if (mongoose.connection.readyState !== 1) {
    logger.error('Mongoose connection error (b) ' + mongoose.connection.readyState);
  }

  if (!process.env.MONGODB_URI || process.env.NODE_ENV === 'test' && !ignoreInitializeLocalDb) {
    await initializeLocalDb();
  }

  wsConnect();

  return cached.conn;
}

export async function dbDisconnect() {
  if (cached.conn) {
    await cached.conn.disconnect();
  }

  if (cached.mongoMemoryServer) {
    await cached.mongoMemoryServer.stop({
      doCleanup: true,
      force: true,
    });
  }

  await wsDisconnect();

  cached.conn = null;
  cached.mongoMemoryServer = null;
}
