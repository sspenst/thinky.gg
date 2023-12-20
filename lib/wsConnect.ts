import { clearAllSchedules } from '@root/server/socket/socketFunctions';
import { GenMongoWSEmitter } from './appSocketToClient';
import dbConnect from './dbConnect';

export async function wsConnect() {
  const db = await dbConnect();

  GenMongoWSEmitter(db);
}

export async function wsDisconnect() {
  clearAllSchedules();
}
