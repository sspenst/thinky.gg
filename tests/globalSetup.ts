// import { MongoMemoryReplSet } from 'mongodb-memory-server';

import { MongoMemoryReplSet } from 'mongodb-memory-server';

module.exports = async () => {
  const mongoServerPool = [];
  const mongoServerUris = [];
  const num = 2;

  process.env.MONGODB_TEST_URI_COUNT = num.toString();

  const mongoServers = await Promise.all(
    Array.from({ length: num }).map(() =>
      MongoMemoryReplSet.create({
        binary: {
          version: '6.0.14',
        },
        replSet: {
          count: 1,
        },
      })
    )
  );

  mongoServers.forEach((server, i) => {
    mongoServerPool.push(server);
    const uri = server.getUri();

    mongoServerUris.push(uri);
    process.env[`MONGODB_TEST_URI_${i}`] = uri;
    console.log(`MONGODB_TEST_URI_${i}: ${uri}`);
  });

  // Add mongoServer to the global config so we can tear it down later
  global.__MONGOSERVER__ = mongoServerPool;
};
