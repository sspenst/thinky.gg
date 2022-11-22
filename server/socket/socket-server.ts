// ts-node --files server/socket/socket-server.ts
import dotenv from 'dotenv';
import startSocketIOServer from '../../pages/socket';

dotenv.config();

startSocketIOServer();
