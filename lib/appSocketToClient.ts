import { Socket } from 'socket.io';
import { io } from 'socket.io-client';
import { logger } from '../helpers/logger';

export const WEBSOCKET_SERVER_URLS = [
  'ws://websocket-server:3001',
];

export function connectToWebsocketServer(url: string) {
  if (!global.appSocketToWebSocketServer) {
    global.appSocketToWebSocketServer = {};
  }

  if (global.appSocketToWebSocketServer[url]?.connected) {
    logger.warn('App Server asked itself to connect to websocket server but it is already connected');

    return null;
  }

  logger.info('Connecting to ' + url);
  const socket = io(url, {
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
  global.appSocketToWebSocketServer[url] = socket as unknown as Socket;

  return global.appSocketToWebSocketServer[url];
}

export function requestBroadcastMatches(urls = WEBSOCKET_SERVER_URLS) {
  for (const url of urls) {
    global.appSocketToWebSocketServer[url]?.emit('broadcastMatches');
  }
}

export function requestBroadcastMatch(matchId: string, urls = WEBSOCKET_SERVER_URLS) {
  for (const url of urls) {
    global.appSocketToWebSocketServer[url]?.emit('broadcastMatch', matchId);
  }
}

export function requestScheduleBroadcastMatch(matchId: string, urls = WEBSOCKET_SERVER_URLS) {
  for (const url of urls) {
    global.appSocketToWebSocketServer[url]?.emit('scheduleBroadcastMatch', matchId);
  }
}

export function requestClearBroadcastMatchSchedule(matchId: string, urls = WEBSOCKET_SERVER_URLS) {
  for (const url of urls) {
    global.appSocketToWebSocketServer[url]?.emit('clearBroadcastMatchSchedule', matchId);
  }
}
