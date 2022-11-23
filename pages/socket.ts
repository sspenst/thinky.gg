import { isValidObjectId } from 'mongoose';
import { Server } from 'socket.io';
import { logger } from '../helpers/logger';
import dbConnect from '../lib/dbConnect';
import { getUserFromToken } from '../lib/withAuth';
import { enrichMultiplayerMatch } from '../models/schemas/multiplayerMatchSchema';
import { getMatches } from './api/match';
import { getMatch } from './api/match/[matchId]';

let ioSocket: any;

export async function broadcastMatches() {
  const matches = await getMatches();

  // loop through all the rooms

  const rooms = ioSocket.sockets.adapter.rooms;

  // clone matches

  for (const [roomId] of rooms) {
    if (!isValidObjectId(roomId)) {
      continue; // this is some other room
    }

    const matchesClone = JSON.parse(JSON.stringify(matches));

    matchesClone.forEach((matchCloneInstance: any) => {
      enrichMultiplayerMatch(matchCloneInstance, roomId);
    });

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
export async function scheduleBroadcastMatch(matchId: string, date: Date) {
  // broadcast match when started

  //  const hash = matchId + '_' + date.getTime();

  setTimeout(async () => {
    console.log('broadcasting scheduled match');
    await broadcastMatch(matchId);
  }, date.getTime() - Date.now());
}

export async function clearBroadcastMatchSchedule(matchId: string, date: Date) {
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
  const matches = await getMatches();

  for (const match of matches) {
    if (match.startTime) {
      await scheduleBroadcastMatch(match.matchId.toString(), match.startTime);
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

  ioSocket.on('disconnect', (socket: any) => {
    logger.info('Socket disconnected'); // @TODO - Can't get this to get called... maybe it isn't 'disconnect'?
  });
  ioSocket.on('connection', async (socket: any) => {
    // get cookies from socket
    const cookies = socket.handshake.headers.cookie;

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

    // TODO can't find anywhere in docs what socket type is... so using any for now
    // TODO: On reconnection, we need to add the user back to any rooms they should have been in before
    socket.join(reqUser?._id.toString());
    // note socket on the same computer will have the same id
    console.log('a user connected', socket.id, reqUser?._id.toString());

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
  });
}
