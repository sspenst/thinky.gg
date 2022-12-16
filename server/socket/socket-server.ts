// ts-node --files server/socket/socket-server.ts
import { createAdapter } from '@socket.io/mongo-adapter';
import { Emitter } from '@socket.io/mongo-emitter';
import { ObjectId } from 'bson';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { logger } from '../../helpers/logger';
import dbConnect from '../../lib/dbConnect';
import { getUserFromToken } from '../../lib/withAuth';
import { MultiplayerMatchModel } from '../../models/mongoose';
import { MultiplayerMatchState } from '../../models/MultiplayerEnums';
import { enrichMultiplayerMatch } from '../../models/schemas/multiplayerMatchSchema';
import { getMatch, quitMatch } from '../../pages/api/match/[matchId]';
import { broadcastConnectedPlayers, broadcastMatches, broadcastPrivateAndInvitedMatches, scheduleBroadcastMatch } from './socketFunctions';

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
// ctrl c
process.on('SIGINT', () => {
  logger.info('SIGINT signal received.');
  process.exit(0);
});
// kill
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received.');
  process.exit(0);
});
let GlobalSocketIO: Server;

export default async function startSocketIOServer() {
  logger.info('Connecting to DB');
  const mongooseConnection = await dbConnect();

  logger.info('Connected to DB');

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
  const mongoAdapter = createAdapter(collection);

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
        const userId = socket.data?._id as ObjectId;

        if (!userId) {
          return;
        }

        setTimeout(async () => {
          const usersInUserIdRoom = await GlobalSocketIO?.in(userId.toString()).fetchSockets();

          if (usersInUserIdRoom?.length === 0) {
            // Means this user hasnt come back online in 5 seconds, so we can quit any open matches they have
            const userMatches = await MultiplayerMatchModel.find({
              createdBy: userId,
              state: MultiplayerMatchState.OPEN
            });

            for (const match of userMatches) {
              // Note, technically if someone joins in between this query and the previous query then the match will have started...
              // but this is a rare edge case and we can just ignore it for now
              await quitMatch(match.matchId.toString(), userId);
            }
          }
        }, 5000);

        await Promise.all([
          broadcastConnectedPlayers(adapted),
          broadcastMatches(mongoEmitter),
        ]);
      });

      // TODO can't find anywhere in docs what socket type is... so using any for now
      // TODO: On reconnection, we need to add the user back to any rooms they should have been in before
      socket.data = {
        _id: reqUser._id,
      };
      socket.join(reqUser?._id.toString());
      // note socket on the same computer will have the same id
      logger.info('a user connected', socket.id, reqUser?._id.toString());
      const matchId = socket.handshake.query.matchId as string;

      if (matchId) {
        logger.info('joining match room ' + matchId);
        socket.join(matchId);
        const match = await getMatch(matchId as string);

        if (match) {
          const matchClone = JSON.parse(JSON.stringify(match));

          enrichMultiplayerMatch(matchClone, reqUser?._id.toString());
          socket?.emit('match', matchClone);
        } else {
          socket?.emit('matchNotFound');
        }
      } else {
        socket.join('LOBBY');
        await Promise.all([broadcastMatches(mongoEmitter),
          broadcastPrivateAndInvitedMatches(mongoEmitter, reqUser._id)]);
      }

      await broadcastConnectedPlayers(adapted);
    } else {
      logger.error('Someone tried to connect to websockets unauthenticated!');
    }
  });
}

startSocketIOServer();
