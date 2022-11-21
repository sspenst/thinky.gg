import type { Server as HTTPServer } from 'http';
import type { Socket as NetSocket } from 'net';
import { NextApiResponse } from 'next';
import { Server } from 'Socket.IO';
import { logger } from '../../../helpers/logger';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
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
      console.log(
        'broadcasting match to',
        player._id.toString(),
        matchClone.levels[0]
      );
      global.ioSocket.to(player._id.toString()).emit('match', matchClone);
      global.ioSocket
        .to(player._id.toString())
        .emit('log', 'wtf mate' + player._id);
    }
  }
}

const SocketHTTPThing = async (
  req: NextApiRequestWithAuth,
  resRaw: NextApiResponse
) => {
  const res = resRaw as NextApiResponseWithSocket;

  if (res.socket.server.io) {
    logger.warn('Socket is already running');
  } else {
    logger.warn('Socket is initializing');
    global.ioSocket = new Server(res.socket.server, {
      cors: {
        // allow pathology.gg and localhost
        origin: 'http://localhost:3000', //['https://pathology.gg', 'http://localhost:3000'],
        methods: ['GET', 'POST'],
      },
    });

    res.socket.server.io = global.ioSocket;

    global.ioSocket.on('connection', async (socket: any) => {
      // TODO can't find anywhere in docs what socket type is... so using any for now
      // TODO: On reconnection, we need to add the user back to any rooms they should have been in before
      socket.join(req.userId);
      // note socket on the same computer will have the same id
      logger.info('a user connected', socket.id, req.userId);
      const matches = await getMatches(req.user);

      for (const match of matches) {
        await broadcastMatch(match.matchId);
      }

      socket.emit('matches', matches);
    });
  }

  res.end();
};

export default withAuth({ GET: {}, POST: {} }, SocketHTTPThing);
