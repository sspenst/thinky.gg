import AlertType from '@root/constants/alertType';
import { GameId } from '@root/constants/GameId';
import { getEnrichNotificationPipelineStages } from '@root/helpers/enrich';
import { MatchGameState } from '@root/helpers/gameStateHelpers';
import { getUsersWithMultiplayerProfileFromIds } from '@root/helpers/getUsersWithMultiplayerProfile';
import { getMatch } from '@root/helpers/match/getMatch';
import cleanUser from '@root/lib/cleanUser';
import Notification from '@root/models/db/notification';
import { Emitter } from '@socket.io/mongo-emitter';
import { Types } from 'mongoose';
import { Server } from 'socket.io';
import { logger } from '../../helpers/logger';
import sortByRating from '../../helpers/sortByRating';
import { MultiplayerMatchState, MultiplayerMatchType } from '../../models/constants/multiplayer';
import User from '../../models/db/user';
import { MultiplayerMatchModel, NotificationModel } from '../../models/mongoose';
import { enrichMultiplayerMatch } from '../../models/schemas/multiplayerMatchSchema';
import { checkForFinishedMatch, checkForUnreadyAboutToStartMatch, getAllMatches } from '../../pages/api/match';

const GlobalMatchTimers = {} as { [matchId: string]: {
  start: NodeJS.Timeout;
  end: NodeJS.Timeout;
} };

export async function broadcastPrivateAndInvitedMatches(gameId: GameId, emitter: Emitter, userId: Types.ObjectId) {
  const matches = await getAllMatches(gameId, userId as unknown as User,
    {
      $or: [
        {
          private: true,
          state: {
            $in: [MultiplayerMatchState.ACTIVE, MultiplayerMatchState.OPEN],
          }
        },
        {
          private: true,
          players: userId,
          state: {
            $in: [MultiplayerMatchState.ACTIVE, MultiplayerMatchState.OPEN],
          }
        }]
      ,
    });

  matches.forEach(match => {
    enrichMultiplayerMatch(match);
  });

  emitter?.to(userId.toString()).emit('privateAndInvitedMatches', matches);
}

export async function broadcastMatches(gameId: GameId, emitter: Emitter) {
  console.log('BROADCASTING???');
  const matches = await getAllMatches(gameId);

  matches.forEach(match => {
    enrichMultiplayerMatch(match);
  });
  emitter?.to('LOBBY-' + gameId).emit('matches', matches);
}

/**
 * @TODO: Should we keep track of the setTimeouts so we can clear them when someone leaves a match?
 * @param matchId
 * @param date
 */
export async function scheduleBroadcastMatch(gameId: GameId, emitter: Emitter, matchId: string) {
  const match = await MultiplayerMatchModel.findOne({ matchId: matchId });

  if (!match) {
    logger.error(`scheduleBroadcastMatch: Could not find match ${matchId}`);

    return;
  }

  // Clear any existing timers for this match
  if (GlobalMatchTimers[matchId]) {
    clearTimeout(GlobalMatchTimers[matchId].start);
    clearTimeout(GlobalMatchTimers[matchId].end);
  }

  const now = Date.now();
  const startTime = new Date(match.startTime).getTime();
  const endTime = new Date(match.endTime).getTime();

  const timeUntilStart = Math.max(0, startTime - now + 1);
  const timeUntilEnd = Math.max(0, endTime - now + 1);

  logger.info(`Scheduling match ${matchId}: start in ${timeUntilStart}ms, end in ${timeUntilEnd}ms`);

  const timeoutStart = setTimeout(async () => {
    logger.info(`Match ${matchId} start timeout triggered`);
    await checkForUnreadyAboutToStartMatch(matchId);
    await broadcastMatch(gameId, emitter, matchId);
  }, timeUntilStart);

  const timeoutEnd = setTimeout(async () => {
    logger.info(`Match ${matchId} end timeout triggered`);
    await checkForFinishedMatch(matchId);
    await broadcastMatch(gameId, emitter, matchId);
  }, timeUntilEnd);

  GlobalMatchTimers[matchId] = {
    start: timeoutStart,
    end: timeoutEnd,
  };
}

export function clearAllSchedules() {
  for (const matchId in GlobalMatchTimers) {
    clearTimeout(GlobalMatchTimers[matchId].start);
    clearTimeout(GlobalMatchTimers[matchId].end);
  }
}

export async function clearBroadcastMatchSchedule(matchId: string) {
  if (GlobalMatchTimers[matchId]) {
    clearTimeout(GlobalMatchTimers[matchId].start);
    clearTimeout(GlobalMatchTimers[matchId].end);
    delete GlobalMatchTimers[matchId];
  }
}

export async function broadcastCountOfUsersInRoom(gameId: GameId, emitter: Server, matchId: string) {
  let clientsMap;

  try {
    // Use local.fetchSockets() in development to avoid adapter timeout issues
    const isLocal = process.env.LOCAL === 'true';
    clientsMap = isLocal 
      ? await emitter?.local.in(matchId).fetchSockets()
      : await emitter?.in(matchId).fetchSockets();
  } catch (e) {
    logger.error('error fetching sockets', e);

    return;
  }

  // clientsMap is a map of socketId -> socket, let's just get the array of sockets
  const clients = Array.from(clientsMap.values());
  const connectedUserIds = clients.map((client) => {
    return client.data.userId;
  });

  // we have all the connected user ids now... so let's get all of them
  const users = await getUsersWithMultiplayerProfileFromIds(gameId, connectedUserIds);
  // remove users with hideStatus: true and inactive users
  const filteredUsers = users.filter(user => !user.hideStatus);

  // limit to 20 users
  emitter?.in(matchId).emit('connectedPlayersInRoom', { users: filteredUsers.sort((a, b) => sortByRating(a, b, MultiplayerMatchType.RushBullet)).slice(0, 20), count: filteredUsers.length });
}

export async function broadcastAlert(emitter: Emitter, userId: Types.ObjectId, type: AlertType, data: any) {
  emitter?.to(userId.toString()).emit('alert', { type, data });
}

export async function broadcastNotifications(gameId: GameId, emitter: Emitter, userId: Types.ObjectId) {
  if (emitter) {
    const notificationAgg = await NotificationModel.aggregate<Notification>([
      { $match: { userId: userId._id } }, // not adding gameId on purpose so we can get all notifications for all games
      { $sort: { createdAt: -1 } },
      { $limit: 5 },
      ...getEnrichNotificationPipelineStages(userId)
    ]);

    notificationAgg.forEach(notification => {
      if (notification.sourceModel === 'User' && notification.source) {
        cleanUser(notification.source as User);
      }

      if (notification.targetModel === 'User' && notification.target) {
        cleanUser(notification.target as User);
      }
    });

    emitter.to(userId.toString()).emit('notifications', notificationAgg);
  }
}

export async function broadcastConnectedPlayers(gameId: GameId, emitter: Server) {
  // return an array of all the connected players
  let clientsMap;

  try {
    // Use local.fetchSockets() in development to avoid adapter timeout issues
    const isLocal = process.env.LOCAL === 'true';
    clientsMap = isLocal
      ? await emitter?.local.fetchSockets()
      : await emitter?.fetchSockets();
  } catch (e) {
    logger.error('error fetching sockets', e);

    return;
  }

  // clientsMap is a map of socketId -> socket, let's just get the array of sockets

  const clients = Array.from(clientsMap.values());

  const connectedUserIds = clients.map((client) => {
    return client.data.userId;
  });

  // we have all the connected user ids now... so let's get all of them
  const users = await getUsersWithMultiplayerProfileFromIds(gameId, connectedUserIds);
  // remove users with hideStatus: true and inactive users
  const filteredUsers = users.filter(user => !user.hideStatus);

  // limit to 20 users
  emitter?.emit('connectedPlayers', { users: filteredUsers.sort((a, b) => sortByRating(a, b, MultiplayerMatchType.RushBullet)).slice(0, 20), count: filteredUsers.length });
}

export async function broadcastMatchGameState(emitter: Emitter, userId: Types.ObjectId, matchId: string, matchGameState: MatchGameState) {
  emitter?.to(matchId).emit('userMatchGameState', {
    userId: userId.toString(),
    matchGameState: matchGameState,
  });
}

export async function broadcastMatch(gameId: GameId, emitter: Emitter, matchId: string) {
  const match = await getMatch(gameId, matchId);

  if (!match) {
    logger.error('cant find match to broadcast to');

    return;
  }

  for (const player of match.players) {
    const matchClone = JSON.parse(JSON.stringify(match));

    enrichMultiplayerMatch(matchClone, player._id.toString());
    // check if emitter is connected
    emitter?.to(player._id.toString()).emit('match', matchClone);
  }

  enrichMultiplayerMatch(match);
  // emit to everyone in the room except the players in the match since we already emitted to them
  emitter?.to(matchId).except(match.players.map((player: User) => player._id.toString())).emit('match', match);
}

export async function broadcastKillSocket(emitter: Emitter, userId: Types.ObjectId) {
  emitter?.to(userId.toString()).emit('killSocket');
}

export async function broadcastReloadPage(emitter: Emitter) {
  emitter?.emit('reloadPage');
}
