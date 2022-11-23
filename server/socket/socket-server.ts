'use strict';

// ts-node --files server/socket/socket-server.ts
import dotenv from 'dotenv';
import { logger } from '../../helpers/logger';
import startSocketIOServer from './socket';

dotenv.config();
logger.info('Starting socket server');

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
startSocketIOServer();
