/* eslint-disable no-var */

import { MongoMemoryServer } from 'mongodb-memory-server';

declare global {
  var mongoose: {
    conn: typeof import('mongoose') | null,
    mongoMemoryServer: MongoMemoryServer | null,
    promise: Promise<typeof import('mongoose')> | null,
  };
}

export {};
