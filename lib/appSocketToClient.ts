import { Socket } from 'socket.io';
import { io } from 'socket.io-client';
import { logger } from '../helpers/logger';

export function getWebsocketUrls() {
  if (process.env.WEBSOCKET_URLS) {
    return process.env.WEBSOCKET_URLS.split(',');
  }

  return [
    'ws://websocket-server:3001',
  ];
}

export function connectToWebsocketServer(url: string) {
  if (!global.appSocketToWebSocketServer) {
    global.appSocketToWebSocketServer = {};
  }

  if (global.appSocketToWebSocketServer[url]?.connected) {
    logger.warn('App Server asked itself to connect to websocket server ' + url + ' but it is already connected');

    return null;
  }

  logger.info('Connecting to ' + url + ' with host ' + process.env.APP_SERVER_WEBSOCKET_HOST);
  const socket = io(url, {
    path: '/api/socket',
    // pass in x-secret to be the env var APP_SERVER_WEBSOCKET_SECRET
    host: process.env.APP_SERVER_WEBSOCKET_HOST,
    rejectUnauthorized: false,
    query: {
      'x-secret': process.env.APP_SERVER_WEBSOCKET_SECRET
    },
  });

  socket.on('connect', () => {
    logger.info('Connected to Websocket ' + url);
  });
  socket.on('disconnect', () => {
    logger.info('Disconnected from Websocket ' + url);
  });
  global.appSocketToWebSocketServer[url] = socket as unknown as Socket;

  return global.appSocketToWebSocketServer[url];
}

export function requestBroadcastMatches() {
  for (const url in global.appSocketToWebSocketServer) {
    if (global.appSocketToWebSocketServer[url].connected) {
      global.appSocketToWebSocketServer[url]?.emit('broadcastMatches');
      break; // just connect to whatever socket is connected... we only need to connect to one
    }
  }
}

export function requestBroadcastMatch(matchId: string) {
  for (const url in global.appSocketToWebSocketServer) {
    if (global.appSocketToWebSocketServer[url].connected) {
      global.appSocketToWebSocketServer[url]?.emit('broadcastMatch', matchId);
      break; // just connect to whatever socket is connected... we only need to connect to one
    }
  }
}

export function requestScheduleBroadcastMatch(matchId: string) {
  for (const url in global.appSocketToWebSocketServer) {
    if (global.appSocketToWebSocketServer[url].connected) {
      global.appSocketToWebSocketServer[url]?.emit('scheduleBroadcastMatch', matchId);
      break; // just connect to whatever socket is connected... we only need to connect to one
    }
  }
}

export function requestClearBroadcastMatchSchedule(matchId: string) {
  for (const url in global.appSocketToWebSocketServer) {
    if (global.appSocketToWebSocketServer[url].connected) {
      global.appSocketToWebSocketServer[url]?.emit('clearBroadcastMatchSchedule', matchId);
      break; // just connect to whatever socket is connected... we only need to connect to one
    }
  }
}
