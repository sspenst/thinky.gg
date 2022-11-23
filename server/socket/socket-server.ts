'use strict';

// ts-node --files server/socket/socket-server.ts
import dotenv from 'dotenv';
import { logger } from '../../helpers/logger';
import startSocketIOServer from '../../pages/socket';

dotenv.config();
logger.info('Starting socket server');
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
