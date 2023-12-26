// import { MongoMemoryReplSet } from 'mongodb-memory-server';

import { MongoMemoryReplSet } from 'mongodb-memory-server';

module.exports = async () => {
  // TODO: figure out how to have this work... we get strange errors when we try to use it

  const mongoServer = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
  });
  const mongoUri = mongoServer.getUri();

  // Set the Mongo URI for the tests to use
  process.env.MONGODB_TEST_URI = mongoUri;
  console.log('MONGODB_TEST_URI', process.env.MONGODB_TEST_URI);

  // Add mongoServer to the global config so we can tear it down later
  global.__MONGOSERVER__ = mongoServer;
};
