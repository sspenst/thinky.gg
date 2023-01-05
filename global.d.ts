/* eslint-disable no-var */

import { Emitter } from '@socket.io/mongo-emitter';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';

declare global {
  var MongoEmitter: Emitter;
  var db: {
    conn: typeof mongoose | null;
    mongoMemoryServer: MongoMemoryReplSet | null;
    promise: Promise<typeof mongoose> | null;
  };
}

export {};
