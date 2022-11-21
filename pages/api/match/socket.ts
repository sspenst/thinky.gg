import type { Server as HTTPServer } from 'http';
import { isValidObjectId } from 'mongoose';
import type { Socket as NetSocket } from 'net';
import { NextApiResponse } from 'next';
import { Server } from 'Socket.IO';
import { logger } from '../../../helpers/logger';
import withAuth, {
  getUserFromToken,
  NextApiRequestWithAuth,
} from '../../../lib/withAuth';
import { enrichMultiplayerMatch } from '../../../models/schemas/multiplayerMatchSchema';
import { getMatches } from '.';
import { getMatch } from './[matchId]';

interface SocketServer extends HTTPServer {
  io?: any;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

export async function broadcastMatches() {
  if (global.ioSocket) {
    const matches = await getMatches();

    // loop through all the rooms

    const rooms = global.ioSocket.sockets.adapter.rooms;

    // clone matches

    for (const [roomId] of rooms) {
      if (!isValidObjectId(roomId)) {
        continue; // this is some other room
      }

      const matchesClone = JSON.parse(JSON.stringify(matches));

      matchesClone.forEach((matchCloneInstance: any) => {
        enrichMultiplayerMatch(matchCloneInstance, roomId);
      });

      if (roomId !== global.ioSocket.sockets.adapter.nsp.name) {
        global.ioSocket.to(roomId).emit('matches', matchesClone);
      }
    }
  }
}

export async function broadcastMatch(matchId: string) {
  if (global.ioSocket) {
    const match = await getMatch(matchId);

    if (!match) {
      logger.error('cant find match to broadcast to');

      return;
    }

    for (const player of match.players) {
      const matchClone = JSON.parse(JSON.stringify(match));

      enrichMultiplayerMatch(matchClone, player._id.toString());

      global.ioSocket.to(player._id.toString()).emit('match', matchClone);
    }
  }
}

export default async function startSocketIOServer() {
  if (global.ioSocket) {
    return;
  }

  global.ioSocket = new Server(3001, {
    cors: {
      // allow pathology.gg and localhost:3000
      origin: 'http://localhost:3000', //['https://pathology.gg', 'http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  global.ioSocket.on('disconnect', (socket: any) => {
    logger.info('Socket disconnected');
  });
  global.ioSocket.on('connection', async (socket: any) => {
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
