// ts-node --transpile-only --files server/socket/socket-server.ts
import { isValidMatchGameState } from '@root/helpers/gameStateHelpers';
import { createAdapter } from '@socket.io/mongo-adapter';
import { Emitter } from '@socket.io/mongo-emitter';
import dotenv from 'dotenv';
import { Types } from 'mongoose';
import { Server } from 'socket.io';
import { logger } from '../../helpers/logger';
import dbConnect from '../../lib/dbConnect';
import { getUserFromToken } from '../../lib/withAuth';
import { MultiplayerMatchState } from '../../models/constants/multiplayer';
import { MultiplayerMatchModel } from '../../models/mongoose';
import { enrichMultiplayerMatch } from '../../models/schemas/multiplayerMatchSchema';
import { getMatch } from '../../pages/api/match/[matchId]';
import { broadcastConnectedPlayers, broadcastCountOfUsersInRoom, broadcastMatches, broadcastMatchGameState, broadcastNotifications, broadcastPrivateAndInvitedMatches, scheduleBroadcastMatch } from './socketFunctions';

'use strict';

const cliArgs = process.argv.slice(2);

// if cli arg is --env-file then run dotenv.config
if (cliArgs[0] === '--env-file') {
  dotenv.config();
}

logger.info('Starting socket server With following keys set: ' + Object.keys(dotenv.config().parsed || {}));

// catch all unhandled errors
process.on('uncaughtException', (err) => {
  logger.error('uncaughtException', err);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  logger.error('unhandledRejection', err);
  process.exit(1);
});

process.on('exit', (code) => {
  console.log('Process exit event with code: ' + code);
});
// ctrl c
process.on('SIGINT', () => {
  logger.info('SIGINT signal received.');
  // exit 0
  process.exit(0);
});
// kill
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received.');
  // exit 0
});
let GlobalSocketIO: Server;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function authenticateSocket(socket: any, next: (err?: Error) => void) {
  const cookies = socket.handshake.headers.cookie;

  if (!cookies) {
    logger.error('No cookies found in socket handshake');

    return next(new Error('Authentication error'));
  }

  const tokenCookie = cookies.split(';').find((c: string) => c.trim().startsWith('token='));

  if (!tokenCookie) {
    logger.error('No token cookie found');

    return next(new Error('Authentication error'));
  }

  try {
    const user = await getUserFromToken(tokenCookie.split('=')[1]);

    if (!user) {
      logger.error('User not found from token');

      return next(new Error('Authentication error'));
    }

    // Attach user to socket for future use
    socket.data.user = user;
    next();
  } catch (error) {
    logger.error('Error during socket authentication', error);
    next(new Error('Authentication error'));
  }
}

export default async function startSocketIOServer(server: Server) {
  logger.info('Connecting to DB');
  const mongooseConnection = await dbConnect();

  logger.info('Connected to DB');

  logger.info('Booting Server on ' + server.path());
  GlobalSocketIO = server;
  const db = mongooseConnection.connection.db;

  try {
    await db.createCollection('socket.io-adapter-events', {
      capped: true,
      size: 1e6
    });
  } catch (e) {
    logger.info('"socket.io-adapter-events" collection already exists');
    // collection already exists
  }

  const collection = db.collection('socket.io-adapter-events');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mongoAdapter = createAdapter(collection as any);

  const adapted = GlobalSocketIO.adapter(mongoAdapter);

  const mongoEmitter = new Emitter(collection);

  logger.info('Server Booted');

  // TODO - need to schedule existing matches...

  // on connect we need to go through all the active levels and broadcast them... also scheduling messages for start and end

  const activeMatches = await MultiplayerMatchModel.find({ state: MultiplayerMatchState.ACTIVE });

  activeMatches.map(async (match) => {
    logger.info('Rescheduling broadcasts for active match ' + match.matchId);
    await scheduleBroadcastMatch(MongoEmitter, match.matchId.toString());
  });

  GlobalSocketIO.use(authenticateSocket);

  GlobalSocketIO.on('connection', async socket => {
    // get cookies from socket
    const reqUser = socket.data.user;

    socket.on('matchGameState', async (data) => {
      const userId = socket.data.userId as Types.ObjectId | undefined;
      const { matchId, matchGameState } = data;

      if (userId && isValidMatchGameState(matchGameState)) {
        await broadcastMatchGameState(mongoEmitter, userId, matchId, matchGameState);
        await broadcastCountOfUsersInRoom(adapted, matchId); // TODO: probably worth finding a better place to put this
      }
    });
    socket.on('disconnect', async () => {
      const userId = socket.data.userId as Types.ObjectId;

      if (!userId) {
        return;
      }

      await Promise.all([
        broadcastConnectedPlayers(adapted),
        broadcastMatches(mongoEmitter),
      ]);
    });

    // TODO can't find anywhere in docs what socket type is... so using any for now
    // TODO: On reconnection, we need to add the user back to any rooms they should have been in before
    socket.data = {
      userId: reqUser._id,
    };
    socket.join(reqUser._id.toString());
    broadcastNotifications(mongoEmitter, reqUser._id);
    // note socket on the same computer will have the same id
    const matchId = socket.handshake.query.matchId as string;

    if (matchId) {
      socket.join(matchId);
      const match = await getMatch(matchId as string);

      if (match) {
        const matchClone = JSON.parse(JSON.stringify(match));

        enrichMultiplayerMatch(matchClone, reqUser._id.toString());
        socket?.emit('match', matchClone);
        broadcastCountOfUsersInRoom(adapted, matchId);
      } else {
        // TODO: emit only to matchId? or can we just show a 404 here?
        socket?.emit('matchNotFound');
      }
    } else {
      socket.join('LOBBY');
      await Promise.all([
        broadcastMatches(mongoEmitter),
        broadcastPrivateAndInvitedMatches(mongoEmitter, reqUser._id),
      ]);
    }

    await broadcastConnectedPlayers(adapted);
  });
}

process.env.NODE_ENV !== 'test' && startSocketIOServer(new Server(3001, {
  path: '/api/socket',
  cors: {
    // allow pathology.gg and localhost:3000
    origin: ['http://localhost:3000', 'https://pathology.gg'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
}));
