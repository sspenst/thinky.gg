import { Emitter } from '@socket.io/mongo-emitter';
import { Mongoose, Types } from 'mongoose';
import { logger } from '../helpers/logger';
import { broadcastKillSocket, broadcastMatch, broadcastMatches, broadcastNotifications, broadcastPrivateAndInvitedMatches, clearBroadcastMatchSchedule, scheduleBroadcastMatch } from '../server/socket/socketFunctions';

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

export async function requestBroadcastPrivateAndInvitedMatches(userId: Types.ObjectId) {
  if (!global.MongoEmitter) {
    logger.warn('App Server asked itself to broadcast private and invited matches but MongoEmitter is not created');

    return;
  }

  await broadcastPrivateAndInvitedMatches(global.MongoEmitter, userId);
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

export async function requestBroadcastNotifications(userId: Types.ObjectId) {
  if (!global.MongoEmitter) {
    logger.warn('App Server asked itself to broadcast notifications but MongoEmitter is not created');

    return;
  }

  await broadcastNotifications(global.MongoEmitter, userId);
}

export async function requestKillSocket(userId: Types.ObjectId) {
  if (!global.MongoEmitter) {
    logger.warn('App Server asked itself to kill socket but MongoEmitter is not created');

    return;
  }

  await broadcastKillSocket(global.MongoEmitter, userId);
}
