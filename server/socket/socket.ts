import { isValidObjectId } from 'mongoose';
import { Server } from 'socket.io';
import getUsersFromIds from '../../helpers/getUsersFromIds';
import { logger } from '../../helpers/logger';
import dbConnect from '../../lib/dbConnect';
import { getUserFromToken } from '../../lib/withAuth';
import MultiplayerMatch from '../../models/db/multiplayerMatch';
import { MultiplayerMatchModel } from '../../models/mongoose';
import { MultiplayerMatchState } from '../../models/MultiplayerEnums';
import { enrichMultiplayerMatch } from '../../models/schemas/multiplayerMatchSchema';
import { checkForFinishedMatch, getAllMatches } from '../../pages/api/match';
import { getMatch, quitMatch } from '../../pages/api/match/[matchId]';

let GlobalSocketIO: Server;

const GlobalMatchTimers = {} as { [matchId: string]: {
  start: NodeJS.Timeout;
  end: NodeJS.Timeout;
} };

export async function broadcastMatches() {
  const matches = await getAllMatches();

  // loop through all the rooms
  const rooms = GlobalSocketIO.sockets.adapter.rooms;

  // clone matches

  for (const [roomId] of rooms) {
    if (!isValidObjectId(roomId)) {
      continue; // this is some other room
    }

    const matchesClone = JSON.parse(JSON.stringify(matches)) as MultiplayerMatch[];

    matchesClone.forEach(match => {
      enrichMultiplayerMatch(match, roomId);
    });

    if (roomId !== GlobalSocketIO.sockets.adapter.nsp.name) {
      GlobalSocketIO.to(roomId).emit('matches', matchesClone);
    }
  }
}

/**
 * @TODO: Should we keep track of the setTimeouts so we can clear them when someone leaves a match?
 * @param matchId
 * @param date
 */
export async function scheduleBroadcastMatch(matchId: string) {
  // broadcast match when started
  //  const hash = matchId + '_' + date.getTime();
  const match = await MultiplayerMatchModel.findOne({ matchId: matchId });

  const timeoutStart = setTimeout(async () => {
    await checkForFinishedMatch(matchId);
    await broadcastMatch(matchId);
  }, 1 + new Date(match.startTime).getTime() - Date.now()); // @TODO: the +1 is kind of hacky, we need to make sure websocket server and mongodb are on same time
  const timeoutEnd = setTimeout(async () => {
    await checkForFinishedMatch(matchId);
    await broadcastMatch(matchId);
  }, 1 + new Date(match.endTime).getTime() - Date.now()); // @TODO: the +1 is kind of hacky, we need to make sure websocket server and mongodb are on same time

  GlobalMatchTimers[matchId] = {
    start: timeoutStart,
    end: timeoutEnd,
  };
}

export async function clearBroadcastMatchSchedule(matchId: string) {
  if (GlobalMatchTimers[matchId]) {
    clearTimeout(GlobalMatchTimers[matchId].start);
    clearTimeout(GlobalMatchTimers[matchId].end);
    delete GlobalMatchTimers[matchId];
  }
}

export async function broadcastConnectedPlayers() {
  // return an array of all the connected players
  const clientsMap = GlobalSocketIO.sockets.sockets;
  // clientsMap is a map of socketId -> socket, let's just get the array of sockets
  const clients = Array.from(clientsMap.values());
  const connectedUserIds = clients.map((client) => {
    return client.data._id;
  });

  // we have all the connected user ids now... so let's get all of them
  const users = await getUsersFromIds(connectedUserIds);

  GlobalSocketIO.emit('connectedPlayers', users);
}

export async function broadcastMatch(matchId: string) {
  const match = await getMatch(matchId);

  if (!match) {
    logger.error('cant find match to broadcast to');

    return;
  }

  for (const player of match.players) {
    const matchClone = JSON.parse(JSON.stringify(match));

    enrichMultiplayerMatch(matchClone, player._id.toString());
    GlobalSocketIO.to(player._id.toString()).emit('match', matchClone);
  }
}

export default async function startSocketIOServer() {
  logger.info('Connecting to DB');
  await dbConnect();
  logger.info('Connected to DB');

  // on connect we need to go through all the active levels and broadcast them... also scheduling messages for start and end
  const matches = await getAllMatches();

  for (const match of matches) {
    if (match.startTime) {
      await scheduleBroadcastMatch(match.matchId.toString());
    }
  }

  logger.info('Booting Server on 3001');
  GlobalSocketIO = new Server(3001, {
    path: '/api/socket',
    cors: {
      // allow pathology.gg and localhost:3000
      origin: ['http://localhost:3000', 'https://pathology.gg'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });
  logger.info('Server Booted');
  // TODO - need to schedule existing matches...
  const activeMatches = await MultiplayerMatchModel.find({ state: MultiplayerMatchState.ACTIVE });

  activeMatches.map(async (match) => {
    logger.info('Rescheduling broadcasts for active match ' + match.matchId);
    await scheduleBroadcastMatch(match.matchId.toString());
  });

  GlobalSocketIO.on('connection', async socket => {
    logger.info('GOT A CONNECTION REQUEST!');
    // get cookies from socket
    const cookies = socket.handshake.headers.cookie;

    if (cookies) {
      const tokenCookie = cookies.split(';').find((c: string) => {
        return c.trim().startsWith('token=');
      });

      const reqUser = await getUserFromToken(tokenCookie?.split('=')[1]);

      if (!reqUser) {
        logger.error('cant find user from token');
        // end connection
        socket.disconnect();

        return;
      }

      socket.on('disconnect', async () => {
        logger.info('User disconnected ' + socket.data?._id);
        const userId = socket.data?._id;

        if (!userId) {
          return;
        }

        const userMatches = await MultiplayerMatchModel.find({
          createdBy: userId,
          state: MultiplayerMatchState.OPEN
        });

        for (const match of userMatches) {
          // Note, technically if someone joins in between this query and the previous query then the match will have started...
          // but this is a rare edge case and we can just ignore it for now
          await quitMatch(match.matchId.toString(), userId);
        }

        await broadcastMatches();
        await broadcastConnectedPlayers();
      });

      // TODO can't find anywhere in docs what socket type is... so using any for now
      // TODO: On reconnection, we need to add the user back to any rooms they should have been in before
      socket.data = {
        _id: reqUser._id,
      };
      socket.join(reqUser?._id.toString());
      // note socket on the same computer will have the same id
      logger.info('a user connected', socket.id, reqUser?._id.toString());

      if (socket.handshake.query.matchId) {
        const match = await getMatch(socket.handshake.query.matchId as string);

        if (match) {
          const matchClone = JSON.parse(JSON.stringify(match));

          enrichMultiplayerMatch(matchClone, reqUser?._id.toString());
          socket.emit('match', matchClone);
        }
      } else {
        await broadcastMatches();
        await broadcastConnectedPlayers();
      }
    } else {
      logger.info('Someone is trying to connect without a token');
      logger.info('Looking for secret header');

      if (!process.env.APP_SERVER_WEBSOCKET_SECRET || socket.handshake.query['x-secret'] !== process.env.APP_SERVER_WEBSOCKET_SECRET) {
        logger.warn('Invalid secret');
        socket.disconnect();
      }

      logger.info('Found secret header... listening for commands from this App server');
      // we should be good to connect and 'command' broadcasts to clients
      socket.on('disconnect', () => {
        logger.info('App server disconnected');
      });
      socket.on('broadcastMatch', async (matchId: string) => {
        await broadcastMatch(matchId);
      });
      socket.on('broadcastMatches', async () => {
        await broadcastMatches();
      });
      socket.on('scheduleBroadcastMatch', async (matchId: string,) => {
        await scheduleBroadcastMatch(matchId);
      });
      socket.on('clearBroadcastMatchSchedule', async (matchId: string) => {
        await clearBroadcastMatchSchedule(matchId);
      }
      );
    }
  });
}
