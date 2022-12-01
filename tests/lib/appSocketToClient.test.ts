import { createServer } from 'http';
import { AddressInfo } from 'net';
import { Server } from 'socket.io';
import { Socket } from 'socket.io-client';
import { Logger } from 'winston';
import { logger } from '../../helpers/logger';
import { connectToWebsocketServer, requestBroadcastMatch, requestBroadcastMatches, requestClearBroadcastMatchSchedule, requestScheduleBroadcastMatch } from '../../lib/appSocketToClient';
import { dbDisconnect } from '../../lib/dbConnect';

let io: Server, serverSocket: Socket;

let socketServerAddress = 'http://localhost:3001';

beforeAll( (done) => {
  jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
  const httpServer = createServer();

  io = new Server(httpServer, {
    path: '/api/socket',

  });
  httpServer.listen(() => {
    const port = (httpServer.address() as AddressInfo).port;

    socketServerAddress = `http://localhost:${port}`;
    connectToWebsocketServer(socketServerAddress);
    io.on('connection', (socket) => {
      serverSocket = socket as unknown as Socket;
    });
    global.appSocketToWebSocketServer.on('connect', done);
  });
});
afterAll(async () => {
  jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
  await dbDisconnect();
  global.appSocketToWebSocketServer.disconnect();
  io.close();
});
afterEach(() => {
  jest.restoreAllMocks();
});
describe('test connect to websocket', () => {
  test('connect to websocket', async () => {
    expect(global.appSocketToWebSocketServer.connected).toBe(true);
    jest.spyOn(logger, 'warn').mockImplementation(() => ({} as Logger));
    expect(connectToWebsocketServer()).toBeNull(); // testing to make sure a second connection is not made
  });
  test('requestBroadcastMatches', (done) => {
    serverSocket.on('broadcastMatches', () => {
      // expect to have reached here
      done();
    });
    requestBroadcastMatches();
  });
  test('requestBroadcastMatch', (done) => {
    serverSocket.on('broadcastMatch', () => {
      // expect to have reached here
      done();
    });
    requestBroadcastMatch('123');
  });
  test('requestScheduleBroadcastSchedule', (done) => {
    serverSocket.on('scheduleBroadcastMatch', () => {
      // expect to have reached here
      done();
    });
    requestScheduleBroadcastMatch('123');
  });
  test('requestClearBroadcastSchedule', (done) => {
    serverSocket.on('clearBroadcastMatchSchedule', () => {
      // expect to have reached here
      done();
    });
    requestClearBroadcastMatchSchedule('123');
  });
});
