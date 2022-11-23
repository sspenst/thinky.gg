import { Socket } from 'socket.io';
import { io } from 'socket.io-client';
import { logger } from '../helpers/logger';

export function connectToWebsocketServer() {
  if (global.appSocketToWebSocketServer?.connected) {
    logger.warn('App Server asked itself to connect to websocket server but it is already connected');

    return;
  }

  const socket = io('ws://websocket-server:3001', {
    path: '/api/socket',
    // pass in x-secret to be the env var APP_SERVER_WEBSOCKET_SECRET
    query: {
      'x-secret': process.env.APP_SERVER_WEBSOCKET_SECRET
    },
  });

  socket.on('connect', () => {
    logger.info('Connected to Websocket');
  });
  socket.on('disconnect', () => {
    logger.info('Disconnected from Websocket');
  });
  global.appSocketToWebSocketServer = socket as unknown as Socket;
}

export function requestBroadcastMatches() {
  global.appSocketToWebSocketServer?.emit('broadcastMatches');
}

export function requestBroadcastMatch(matchId: string) {
  global.appSocketToWebSocketServer?.emit('broadcastMatch', matchId);
}

export function requestScheduleBroadcastMatch(matchId: string, date: Date) {
  global.appSocketToWebSocketServer?.emit('scheduleBroadcastMatch', matchId, date.toString());
}

export function requestClearBroadcastMatchSchedule(matchId: string, date: Date) {
  global.appSocketToWebSocketServer?.emit('clearBroadcastMatchSchedule', matchId, date.toString());
}
