/* eslint-disable no-var */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

declare global {
  var db: {
    conn: typeof mongoose | null,
    mongoMemoryServer: MongoMemoryServer | null,
    promise: Promise<typeof mongoose> | null,
  };
}

export {};
