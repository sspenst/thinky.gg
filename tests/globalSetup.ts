import { MongoMemoryReplSet } from 'mongodb-memory-server';

module.exports = async () => {
  const mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const mongoUri = mongoServer.getUri();

  // Set the Mongo URI for the tests to use
  process.env.MONGODB_URI = mongoUri;

  // Add mongoServer to the global config so we can tear it down later
  global.__MONGOSERVER__ = mongoServer;
};
