import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
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
    return cached.conn;
  }

  if (!cached.promise) {
    const options = {
      connectTimeoutMS: 10000,
      heartbeatFrequencyMS: 30000,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 20000,
    };

    let uri = undefined;

    if (!process.env.MONGODB_URI || process.env.NODE_ENV === 'test') {
      cached.mongoMemoryServer = await MongoMemoryServer.create();
      uri = cached.mongoMemoryServer.getUri();
    } else {
      uri = process.env.MONGODB_URI;
    }

    cached.promise = mongoose.connect(uri, options).then((mongoose) => {
      return mongoose;
    });
  }

  cached.conn = await cached.promise;

  if (!process.env.MONGODB_URI || process.env.NODE_ENV === 'test') {
    await initializeLocalDb();
  }

  return cached.conn;
}

export async function dbDisconnect() {
  if (cached.conn) {
    await cached.conn.disconnect();
  }

  if (cached.mongoMemoryServer) {
    cached.mongoMemoryServer.stop();
  }
}
