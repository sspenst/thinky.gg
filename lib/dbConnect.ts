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
      logger.warn('Mongoose connection error ' + mongoose.connection.readyState);
    }

    return cached.conn;
  }

  if (!cached.promise) {
    const options: ConnectOptions = {
      /*connectTimeoutMS: 10000,
      heartbeatFrequencyMS: 30000,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 20000,*/
    };

    let uri = undefined;

    /* istanbul ignore else */
    if (process.env.NODE_ENV === 'test' || !process.env.MONGODB_URI) {
      // create with replica
      if (!process.env.MONGODB_TEST_URI) {
        const replSetOptions = {
          replSet: {
            count: 1,
          },

        };
        const s = Date.now();

        cached.mongoMemoryServer = await MongoMemoryReplSet.create(replSetOptions);
        console.log('MongoMemoryReplSet.create took ' + (Date.now() - s) + 'ms');
        uri = cached.mongoMemoryServer.getUri();
      } else {
        uri = process.env.MONGODB_TEST_URI;
        // now set the uri to point to a randomally generated database name
        // this is so that we can run tests in parallel
        const randomDbName = 't_' + new Types.ObjectId().toString();

        uri = uri.replace('/?', '/' + randomDbName + '?');
        // console.warn('MONGODB_TEST_URI is set. Using ' + uri + ' instead of creating a new mongo memory server');
      }
    } else {
      uri = process.env.MONGODB_URI;
    }

    cached.promise = mongoose.connect(uri as string, options).then((mongoose) => {
      return mongoose;
    }).catch((e) => {
      logger.error('Error connecting to DB', e);
      throw e;
    });
  }

  cached.conn = await cached.promise;

  /* istanbul ignore next */
  if (mongoose.connection.readyState !== 1) {
    logger.error('Mongoose connection error (b) ' + mongoose.connection.readyState);
  }

  if ((!process.env.MONGODB_URI || process.env.NODE_ENV === 'test') && !ignoreInitializeLocalDb) {
    await initializeLocalDb();
  }

  wsConnect();

  return cached.conn;
}

export async function dbDisconnect(log: boolean = false) {
  log && console.log('in dbdisconnect');

  if (cached.conn) {
    log && console.log('in dbdisconnect. cached.conn exists');

    try {
      await cached.conn.disconnect();
    } catch (e) {
      logger.error('In dbDisconnect. Error disconnecting from db', e);
    }
  }

  if (cached.mongoMemoryServer) {
    log && console.log('in dbdisconnect. cached.mongoMemoryServer exists');

    try {
      await cached.mongoMemoryServer.stop({
        doCleanup: true,
        force: true,
      });
    } catch (e) {
      logger.error('In dbDisconnect. Error stopping mongo memory server', e);
    }
  }

  await wsDisconnect();

  cached.conn = null;
  cached.mongoMemoryServer = null;
}
