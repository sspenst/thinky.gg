import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose, { ConnectOptions } from 'mongoose';
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
      logger.error('Mongoose connection error');
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
    logger.error('Mongoose connection error');
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
    await cached.mongoMemoryServer.stop();
  }

  clearAllSchedules();
}
