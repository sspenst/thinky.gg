import { isValidObjectId } from 'mongoose';
import { Server } from 'socket.io';
import { logger } from '../../helpers/logger';
import dbConnect from '../../lib/dbConnect';
import { getUserFromToken } from '../../lib/withAuth';
import { MultiplayerMatchModel } from '../../models/mongoose';
import { MultiplayerMatchState } from '../../models/MultiplayerEnums';
import { enrichMultiplayerMatch } from '../../models/schemas/multiplayerMatchSchema';
import { checkForFinishedMatch, getAllMatches } from '../../pages/api/match';
import { getMatch, quitMatch } from '../../pages/api/match/[matchId]';

let ioSocket: any;

export async function broadcastMatches() {
  logger.warn('broadcastMatches');
  const matches = await getAllMatches();

  // loop through all the rooms
  logger.warn('broadcastMatches getting rooms');
  const rooms = ioSocket.sockets.adapter.rooms;

  logger.warn('broadcastMatches got rooms');
  // clone matches

  for (const [roomId] of rooms) {
    if (!isValidObjectId(roomId)) {
      continue; // this is some other room
    }

    const matchesClone = JSON.parse(JSON.stringify(matches));

    matchesClone.forEach((matchCloneInstance: any) => {
      enrichMultiplayerMatch(matchCloneInstance, roomId);
    });
    logger.warn('broadcastMatches emitting to room ' + roomId);

    if (roomId !== ioSocket.sockets.adapter.nsp.name) {
      ioSocket.to(roomId).emit('matches', matchesClone);
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

  setTimeout(async () => {
    await checkForFinishedMatch(matchId);
    await broadcastMatch(matchId);
  }, 1 + new Date(match.startTime).getTime() - Date.now()); // @TODO: the +1 is kind of hacky, we need to make sure websocket server and mongodb are on same time
  setTimeout(async () => {
    await checkForFinishedMatch(matchId);
    await broadcastMatch(matchId);
  }, 1 + new Date(match.endTime).getTime() - Date.now()); // @TODO: the +1 is kind of hacky, we need to make sure websocket server and mongodb are on same time
}

export async function clearBroadcastMatchSchedule(matchId: string) {
  //const hash = matchId + '_' + date.getTime();
  logger.warn('trying to clear timeouts in matches TODO: implement');
  /*if (global.scheduledBroadcastTimeouts[hash]) {
    console.log('Clearing broadcast match schedule for matchId: ' + matchId);
    clearTimeout(scheduledBroadcastTimeouts[hash]);
  }*/
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
    ioSocket.to(player._id.toString()).emit('match', matchClone);
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
  ioSocket = new Server(3001, {
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

  activeMatches.map((match) => {
    scheduleBroadcastMatch(match.matchId.toString());
  });

  ioSocket.on('connection', async (socket: any) => {
    logger.info('GOT A CONNECTION REQUEST!');
    // get cookies from socket
    const cookies = socket.handshake.headers.cookie;

    if (cookies) {
      const tokenCookie = cookies.split(';').find((c: string) => {
        return c.trim().startsWith('token=');
      });

      const reqUser = await getUserFromToken(tokenCookie.split('=')[1]);

      if (!reqUser) {
        logger.error('cant find user from token');
        // end connection
        socket.disconnect();

        return;
      }

      socket.on('disconnect', async () => {
        logger.info('User disconnected ' + socket.data?.userId);
        const userId = socket.data?.userId;

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
      });

      // TODO can't find anywhere in docs what socket type is... so using any for now
      // TODO: On reconnection, we need to add the user back to any rooms they should have been in before
      socket.data = {
        userId: reqUser._id,
      };
      socket.join(reqUser?._id.toString());
      // note socket on the same computer will have the same id
      logger.info('a user connected', socket.id, reqUser?._id.toString());

      if (socket.handshake.query.matchId) {
        const match = await getMatch(socket.handshake.query.matchId);

        if (match) {
          const matchClone = JSON.parse(JSON.stringify(match));

          enrichMultiplayerMatch(matchClone, reqUser?._id.toString());
          socket.emit('match', matchClone);
        }
      } else {
        await broadcastMatches();
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
