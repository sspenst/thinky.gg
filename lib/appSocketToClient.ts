import { GameId } from '@root/constants/GameId';
import { Emitter } from '@socket.io/mongo-emitter';
import { Mongoose, Types } from 'mongoose';
import { logger } from '../helpers/logger';
import { broadcastAlert, broadcastKillSocket, broadcastMatch, broadcastMatches, broadcastNotifications, broadcastPrivateAndInvitedMatches, broadcastReloadPage, clearBroadcastMatchSchedule, scheduleBroadcastMatch } from '../server/socket/socketFunctions';
import AlertType from '@root/constants/alertType';

export function GenMongoWSEmitter(mongooseConnection: Mongoose) {
  if (global.MongoEmitter) {
    logger.warn('App Server asked itself to instanciate MongoEmitter but it is already created');

    return null;
  }

  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  const db = mongooseConnection.connection.db;

  if (!db) {
    logger.error('GenMongoWSEmitter - Could not get db from mongoose connection');

    return null;
  }

  const collection = db.collection('socket.io-adapter-events');

  logger.warn('Created MongoEmitter');
  global.MongoEmitter = new Emitter(collection);

  return global.MongoEmitter;
}

export async function requestBroadcastPrivateAndInvitedMatches(gameId: GameId, userId: Types.ObjectId) {
  if (!global.MongoEmitter || process.env.NODE_ENV === 'test') {
    process.env.NODE_ENV !== 'test' && logger.warn('App Server asked itself to broadcast private and invited matches but MongoEmitter is not created');

    return;
  }

  await broadcastPrivateAndInvitedMatches(gameId, global.MongoEmitter, userId);
}

export async function requestBroadcastMatches(gameId: GameId ) {
  if (!global.MongoEmitter || process.env.NODE_ENV === 'test') {
    process.env.NODE_ENV !== 'test' && logger.warn('App Server asked itself to broadcast matches but MongoEmitter is not created');

    return;
  }

  await broadcastMatches(gameId, global.MongoEmitter);
}

export async function requestBroadcastMatch(gameId: GameId, matchId: string) {
  if (!global.MongoEmitter || process.env.NODE_ENV === 'test') {
    process.env.NODE_ENV !== 'test' && logger.warn('App Server asked itself to broadcast match but MongoEmitter is not created');

    return;
  }

  await broadcastMatch(gameId, global.MongoEmitter, matchId);
}

export async function requestScheduleBroadcastMatch(gameId: GameId, matchId: string) {
  if (!global.MongoEmitter || process.env.NODE_ENV === 'test') {
    process.env.NODE_ENV !== 'test' && logger.warn('App Server asked itself to schedule broadcast match but MongoEmitter is not created');
  }

  await scheduleBroadcastMatch(gameId, global.MongoEmitter, matchId);
}

export async function requestClearBroadcastMatchSchedule(matchId: string) {
  if (!global.MongoEmitter || process.env.NODE_ENV === 'test') {
    process.env.NODE_ENV !== 'test' && logger.warn('App Server asked itself to clear broadcast match schedule but MongoEmitter is not created');
  }

  await clearBroadcastMatchSchedule(matchId);
}

export async function requestBroadcastNotifications(gameId: GameId, userId: Types.ObjectId) {
  if (!global.MongoEmitter || process.env.NODE_ENV === 'test') {
    process.env.NODE_ENV !== 'test' && logger.warn('App Server asked itself to broadcast notifications but MongoEmitter is not created');

    return;
  }

  await broadcastNotifications(gameId, global.MongoEmitter, userId);
}

export async function requestBroadcastAlert(userId: Types.ObjectId, type: AlertType, data: any) {
  if (!global.MongoEmitter || process.env.NODE_ENV === 'test') {
    process.env.NODE_ENV !== 'test' && logger.warn('App Server asked itself to broadcast alert but MongoEmitter is not created');

    return;
  }

  await broadcastAlert(global.MongoEmitter, userId, type, data);
}

export async function requestKillSocket(userId: Types.ObjectId) {
  if (!global.MongoEmitter || process.env.NODE_ENV === 'test') {
    process.env.NODE_ENV !== 'test' && logger.warn('App Server asked itself to kill socket but MongoEmitter is not created');

    return;
  }

  await broadcastKillSocket(global.MongoEmitter, userId);
}

export async function requestBroadcastReloadPage() {
  if (!global.MongoEmitter || process.env.NODE_ENV === 'test') {
    process.env.NODE_ENV !== 'test' && logger.warn('App Server asked itself to reload page but MongoEmitter is not created');

    return;
  }

  await broadcastReloadPage(global.MongoEmitter);
}
