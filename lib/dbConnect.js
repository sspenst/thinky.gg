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

  if (!cached.promise) {
    const options = {
      minPoolSize: 5,
    };

    cached.promise = mongoose.connect(process.env.MONGODB_URI, options).then((mongoose) => {
      return mongoose
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
