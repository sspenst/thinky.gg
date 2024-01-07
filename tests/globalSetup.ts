// import { MongoMemoryReplSet } from 'mongodb-memory-server';

import { MongoMemoryReplSet } from 'mongodb-memory-server';

module.exports = async () => {
  const mongoServerPool = [];
  const mongoServerUris = [];
  const num = 4;

  process.env.MONGODB_TEST_URI_COUNT = '3';

  for (let i = 0; i < num; i++) {
    mongoServerPool.push(await MongoMemoryReplSet.create({
      replSet: { count: 1 },
    }));
    mongoServerUris.push(mongoServerPool[i].getUri());
    process.env[`MONGODB_TEST_URI_${i}`] = mongoServerUris[i];
    console.log(`MONGODB_TEST_URI_${i}: ${mongoServerUris[i]}`);
  }

  // Add mongoServer to the global config so we can tear it down later
  global.__MONGOSERVER__ = mongoServerPool;
};
