import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose, { ConnectOptions, Types } from 'mongoose';
import { logger } from '../helpers/logger';
import { clearAllSchedules } from '../server/socket/socketFunctions';
import { GenMongoWSEmitter } from './appSocketToClient';
import initializeLocalDb from './initializeLocalDb';

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

export default async function dbConnect() {
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
        cached.mongoMemoryServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });

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

  if (!process.env.MONGODB_URI || process.env.NODE_ENV === 'test') {
    await initializeLocalDb();
  }

  await GenMongoWSEmitter(cached.conn);

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

  clearAllSchedules();
}
