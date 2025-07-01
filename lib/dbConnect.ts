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
    autoReconnect: true,
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
      connectTimeoutMS: 10000,
      heartbeatFrequencyMS: 30000,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 20000,
    };

    let uri = '';

    /* istanbul ignore else */
    if (process.env.NODE_ENV === 'test' || !process.env.MONGODB_URI) {
      // create with replica
      if (!process.env.MONGODB_TEST_URI_COUNT) {
        const s = Date.now();

        cached.mongoMemoryServer = await MongoMemoryReplSet.create({
          binary: {
            version: '6.0.14',
          },
          replSet: {
            count: 1,
          },
        });
        console.log('MongoMemoryReplSet.create took ' + (Date.now() - s) + 'ms');
        uri = cached.mongoMemoryServer.getUri();
      } else {
        const count = parseInt(process.env.MONGODB_TEST_URI_COUNT);

        uri = process.env['MONGODB_TEST_URI_' + Math.floor(Math.random() * count)] as string;
        // now set the uri to point to a randomally generated database name
        // this is so that we can run tests in parallel
        const randomDbName = 't_' + new Types.ObjectId().toString();

        uri = uri.replace('/?', '/' + randomDbName + '?');
        // console.warn('MONGODB_TEST_URI is set. Using ' + uri + ' instead of creating a new mongo memory server');
      }
    } else {
      uri = process.env.MONGODB_URI;
    }

    cached.promise = mongoose.connect(uri, options).then((mongoose) => {
      mongoose.connection.on('disconnected', () => {
        if (!cached.autoReconnect) {
          return;
        }

        // Prevent multiple concurrent reconnection attempts
        if (cached.promise) {
          logger.warn('Reconnection already in progress, skipping duplicate attempt');
          return;
        }

        logger.warn('Mongoose connection disconnected. Attempting to reconnect...');
        
        // Implement exponential backoff for reconnection attempts
        const reconnectWithBackoff = (retryCount = 0, maxRetries = 5) => {
          if (retryCount >= maxRetries) {
            logger.error('Max reconnection attempts reached, stopping auto-reconnect');
            cached.autoReconnect = false;
            return;
          }

          const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Cap at 30 seconds
          
          setTimeout(() => {
            // Check if we're still disconnected before attempting reconnection
            if (mongoose.connection.readyState === 0) {
              cached.promise = mongoose.connect(uri, options)
                .then(() => {
                  logger.info('Successfully reconnected to database');
                  cached.promise = null;
                })
                .catch((error) => {
                  logger.error('Reconnection attempt failed:', error);
                  cached.promise = null;
                  reconnectWithBackoff(retryCount + 1, maxRetries);
                });
            }
          }, delay);
        };

        reconnectWithBackoff();
      });

      mongoose.connection.on('error', (err) => {
        logger.error('Mongoose connection error:', err);
      });

      return mongoose;
    }).catch((e) => {
      logger.error('Error connecting to DB', e);
      throw e;
    });
  }

  cached.conn = await cached.promise;
  cached.promise = null;

  /* istanbul ignore next */
  if (mongoose.connection.readyState !== 1) {
    logger.error('Mongoose connection error (b) ' + mongoose.connection.readyState);
  }

  if ((!process.env.MONGODB_URI || process.env.NODE_ENV === 'test') && !ignoreInitializeLocalDb) {
    await initializeLocalDb();
  }

  await wsConnect();

  return cached.conn;
}

export async function dbDisconnect(log: boolean = false) {
  log && console.log('In dbDisconnect');
  // NB: dbDisconnect is intentional, so we don't want to automatically reconnect
  cached.autoReconnect = false;

  if (process.env.NODE_ENV === 'test') {
    // drop db
    await mongoose.connection.db?.dropDatabase();
  }

  if (cached.conn) {
    log && console.log('In dbDisconnect. cached.conn exists');

    try {
      await cached.conn.disconnect();
    } catch (e) {
      logger.error('In dbDisconnect. Error disconnecting from db', e);
    }
  }

  if (cached.mongoMemoryServer) {
    log && console.log('In dbDisconnect. cached.mongoMemoryServer exists');

    try {
      await cached.mongoMemoryServer.stop({
        doCleanup: true,
        force: true,
      });
    } catch (e) {
      logger.error('In dbDisconnect. Error stopping mongo memory server', e);
    }
  }

  cached.autoReconnect = true;

  await wsDisconnect();

  cached.conn = null;
  cached.promise = null;
  cached.mongoMemoryServer = null;
}
