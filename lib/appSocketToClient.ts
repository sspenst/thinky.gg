import { Emitter } from '@socket.io/mongo-emitter';
import { logger } from '../helpers/logger';
import { broadcastMatch, broadcastMatches, clearBroadcastMatchSchedule, scheduleBroadcastMatch } from '../server/socket/socket';
import dbConnect from './dbConnect';

export async function GenMongoWSEmitter() {
  if (global.MongoEmitter) {
    logger.warn('App Server asked itself to instanciate MongoEmitter but it is already created');

    return null;
  }

  const mongooseConnection = await dbConnect();
  const db = mongooseConnection.connection.db;
  const collection = db.collection('socket.io-adapter-events');

  global.MongoEmitter = new Emitter(collection);

  return global.MongoEmitter;
}

export async function requestBroadcastMatches() {
  await broadcastMatches(global.MongoEmitter);
}

export async function requestBroadcastMatch(matchId: string) {
  await broadcastMatch(global.MongoEmitter, matchId);
}

export async function requestScheduleBroadcastMatch(matchId: string) {
  await scheduleBroadcastMatch(global.MongoEmitter, matchId);
}

export async function requestClearBroadcastMatchSchedule(matchId: string) {
  await clearBroadcastMatchSchedule(matchId);
}
