import { ObjectId } from 'bson';
import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import GraphType from '../../../../constants/graphType';
import TestId from '../../../../constants/testId';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { GraphModel, StatModel, UserModel } from '../../../../models/mongoose';
import statisticsHandler from '../../../../pages/api/statistics/index';

afterEach(() => {
  jest.restoreAllMocks();
});
afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();

describe('Testing statistics api', () => {
  test('Calling with wrong http method should fail', async () => {
    // make user A follow user B so we test more flows in the statistics api
    await dbConnect();
    await GraphModel.create({
      source: new ObjectId(TestId.USER),
      target: new ObjectId(TestId.USER_B),
      sourceModel: 'User',
      targetModel: 'User',
      type: GraphType.FOLLOW,
    });
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await statisticsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Method not allowed');
        expect(res.status).toBe(405);
      },
    });
  });
  test('Calling with correct http method should be OK', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await statisticsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.topFollowedUsers).toBeDefined();
        expect(response.topLevelCreators).toBeDefined();
        expect(response.topScorers).toBeDefined();
        expect(response.topReviewers).toBeDefined();
        expect(response.topRecordBreakers).toBeDefined();
        expect(response.newUsers).toBeDefined();
        expect(response.currentlyOnlineCount).toBeDefined();
        expect(response.registeredUsersCount).toBeDefined();
        expect(response.totalAttempts).toBeDefined();
        expect(response.totalLevelsCount).toBeDefined();
        expect(res.status).toBe(200);
      },
    });
  });
  test('Mock error to getNewUsers in statistics', async () => {
    jest.spyOn(UserModel, 'find').mockImplementation(() => {
      throw new Error('Mock error');
    });
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await statisticsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Error finding statistics');
        expect(res.status).toBe(404);
      },
    });
  });
  test('Mock error to getTotalAttempts in statistics', async () => {
    jest.spyOn(StatModel, 'aggregate').mockImplementation(() => {
      throw new Error('Mock error');
    });
    //jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await statisticsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.totalAttempts).toBe(0);
        expect(res.status).toBe(200);
      },
    });
  });
});
