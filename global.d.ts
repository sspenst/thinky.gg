/* eslint-disable no-var */

import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Socket } from 'socket.io';

declare global {
  var appSocketToWebSocketServer: Socket;
  var db: {
    conn: typeof mongoose | null;
    mongoMemoryServer: MongoMemoryReplSet | null;
    promise: Promise<typeof mongoose> | null;
  };
}

export {};
