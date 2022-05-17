import { MongoMemoryServer } from 'mongodb-memory-server';
import crypto from 'crypto';
import initializeLocalDb from './initializeLocalDb';
import mongoose from 'mongoose';

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}
async function dbDisconnect() {
  if (cached.conn) {
    await cached.conn.disconnect();
    cached.conn = null;
  }
}
async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  const id = crypto.randomUUID();
  console.time(id);

  if (!cached.promise) {
    const options = {
      connectTimeoutMS: 10000,
      heartbeatFrequencyMS: 30000,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 20000,
    };

    let uri = undefined;

    if (process.env.LOCAL) {
      const mongod = await MongoMemoryServer.create();
      uri = mongod.getUri();
    } else if (!process.env.MONGODB_URI) {
      throw 'MONGODB_URI not defined';
    } else {
      uri = process.env.MONGODB_URI;
    }

    
    cached.promise = mongoose.connect(uri, options).then((mongoose) => {
      return mongoose;
    });
  }

  cached.conn = await cached.promise;
  

  if (process.env.LOCAL) {
    await initializeLocalDb();
  }

  return cached.conn;
}

export default dbConnect;
export { dbDisconnect };