import crypto from 'crypto';
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
      minPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 20000,
    };

    console.log(id, 'connecting...');
    cached.promise = mongoose.connect(process.env.MONGODB_URI, options).then((mongoose) => {
      return mongoose
    });
  }

  cached.conn = await cached.promise;
  console.timeEnd(id);
  console.log(id, 'awaited promise');
  return cached.conn;
}

export default dbConnect;
