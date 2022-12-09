import { Emitter } from '@socket.io/mongo-emitter';
import { Mongoose } from 'mongoose';
import { logger } from '../helpers/logger';
import { broadcastMatch, broadcastMatches, clearBroadcastMatchSchedule, scheduleBroadcastMatch } from '../server/socket/socket';

export async function GenMongoWSEmitter(mongooseConnection: Mongoose) {
  if (global.MongoEmitter) {
    logger.warn('App Server asked itself to instanciate MongoEmitter but it is already created');

    return null;
  }

  const db = mongooseConnection.connection.db;
  const collection = db.collection('socket.io-adapter-events');

  global.MongoEmitter = new Emitter(collection);

  return global.MongoEmitter;
}

export async function requestBroadcastMatches() {
  if (!global.MongoEmitter) {
    logger.warn('App Server asked itself to broadcast matches but MongoEmitter is not created');

    return;
  }

  await broadcastMatches(global.MongoEmitter);
}

export async function requestBroadcastMatch(matchId: string) {
  if (!global.MongoEmitter) {
    logger.warn('App Server asked itself to broadcast match but MongoEmitter is not created');

    return;
  }

  await broadcastMatch(global.MongoEmitter, matchId);
}

export async function requestScheduleBroadcastMatch(matchId: string) {
  if (!global.MongoEmitter) {
    logger.warn('App Server asked itself to schedule broadcast match but MongoEmitter is not created');
  }

  await scheduleBroadcastMatch(global.MongoEmitter, matchId);
}

export async function requestClearBroadcastMatchSchedule(matchId: string) {
  if (!global.MongoEmitter) {
    logger.warn('App Server asked itself to clear broadcast match schedule but MongoEmitter is not created');
  }

  await clearBroadcastMatchSchedule(matchId);
}
