/* eslint-disable no-var */

import { Emitter } from '@socket.io/mongo-emitter';
import admin from 'firebase-admin';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';

declare global {
  var db: {
    conn: typeof mongoose | null;
    mongoMemoryServer: MongoMemoryReplSet | null;
    promise: Promise<typeof mongoose> | null;
  };
  var firebaseApp: admin.app.App;
  var MongoEmitter: Emitter;
  interface Array<T> {
    findLastIndex(
      predicate: (value: T, index: number, obj: T[]) => unknown,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      thisArg?: any,
    ): number
  }
}

export {};
