// ts-node -r tsconfig-paths/register --files scripts/cleanup-orphaned-userauth.ts

import { runCleanupOrphanedUserAuth } from '@root/helpers/cleanupOrphanedUserAuth';
import dbConnect from '@root/lib/dbConnect';
import dotenv from 'dotenv';

'use strict';

dotenv.config();
console.log('loaded env vars');

async function init() {
  console.log('connecting to db...');
  await dbConnect();
  console.log('connected');

  await runCleanupOrphanedUserAuth();

  process.exit(0);
}

init();
