import mongoose, { ConnectOptions } from 'mongoose';

export async function rawDbConnect() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI not defined');
  }

  const options: ConnectOptions = {
    connectTimeoutMS: 10000,
    heartbeatFrequencyMS: 30000,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 20000,
  };
  const val = await mongoose.connect(uri, options).then((mongoose) => {
    return mongoose;
  });

  return val;
}

export async function rawDbDisconnect(connection: any) {
  if (connection.conn) {
    await connection.conn.disconnect();
  }
}
