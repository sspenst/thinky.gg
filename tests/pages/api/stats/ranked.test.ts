import AdminCommand from '@root/constants/adminCommand';
import Direction from '@root/constants/direction';
import Level from '@root/models/db/level';
import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { LevelModel, UserModel } from '../../../../models/mongoose';
import adminHandler from '../../../../pages/api/admin/index';
import { processQueueMessages } from '../../../../pages/api/internal-jobs/worker';
import createLevelHandler from '../../../../pages/api/level/index';
import publishLevelHandler from '../../../../pages/api/publish/[id]';
import statsHandler from '../../../../pages/api/stats/index';
import unpublishLevelHandler from '../../../../pages/api/unpublish/[id]';

beforeAll(async () => {
  await dbConnect();
});
afterEach(() => {
  jest.restoreAllMocks();
});
afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();

let rankedLevelId: string;

describe('Publishing a new level, setting it to ranked, verifying ranked data is handled correctly', () => {
  test('Creating a level with USER', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            name: 'ranked',
            data: '40\nC3',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await createLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.success).toBe(true);
        rankedLevelId = response._id;
        expect(res.status).toBe(200);
      },
    });
  });

  test('PUT a stat for this level', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },

          body: {
            directions: [Direction.RIGHT, Direction.DOWN],
            levelId: rankedLevelId,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await statsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.success).toBe(true);
        expect(res.status).toBe(200);
        const lvl = await LevelModel.findById(rankedLevelId);

        expect(lvl.leastMoves).toBe(2);
      },
    });
  });

  test('Publish the level', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: rankedLevelId,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await publishLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        await processQueueMessages();

        expect(response.error).toBeUndefined();
        expect(response._id).toBe(rankedLevelId);

        const level = await LevelModel.findById(rankedLevelId) as Level;

        expect(level.isDraft).toBe(false);
        expect(level.isRanked).toBe(false);
        expect(level.calc_difficulty_estimate).toBe(-1);
        expect(level.calc_playattempts_duration_sum).toBe(0);
        expect(level.calc_stats_players_beaten).toBe(1);
        expect(level.calc_playattempts_unique_users).toHaveLength(0);
        expect(level.calc_playattempts_just_beaten_count).toBe(0);
        expect(level.calc_reviews_count).toBe(0);
        expect(level.calc_reviews_score_laplace.toFixed(2)).toBe('0.67');

        const u = await UserModel.findById(TestId.USER);

        expect(u.calcRankedSolves).toBe(0);
      },
    });
  });

  test('Admin switches the level to ranked', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER_ADMIN),
          },
          body: {
            targetId: rankedLevelId,
            command: AdminCommand.SwitchIsRanked,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await adminHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();

        const level = await LevelModel.findById(rankedLevelId) as Level;

        expect(level.isRanked).toBe(true);

        const u = await UserModel.findById(TestId.USER);

        expect(u.calcRankedSolves).toBe(1);
      },
    });
  });

  test('unpublishing a ranked level should fail', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: rankedLevelId,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await unpublishLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Cannot unpublish ranked levels');
        expect(res.status).toBe(403);
      },
    });
  });

  // TODO: another user should beat the level and then we should see the stats update
  test('PUT another stat for this level', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },

          body: {
            directions: [Direction.RIGHT, Direction.DOWN],
            levelId: rankedLevelId,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await statsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.success).toBe(true);
        expect(res.status).toBe(200);

        const u = await UserModel.findById(TestId.USER_B);

        expect(u.calcRankedSolves).toBe(1);
      },
    });
  });

  test('Admin switches the level back to unranked', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER_ADMIN),
          },
          body: {
            targetId: rankedLevelId,
            command: AdminCommand.SwitchIsRanked,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await adminHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();

        const level = await LevelModel.findById(rankedLevelId) as Level;

        expect(level.isRanked).toBe(false);

        const u = await UserModel.findById(TestId.USER);

        expect(u.calcRankedSolves).toBe(0);
      },
    });
  });

  test('unpublishing should now succeed', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: rankedLevelId,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await unpublishLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
      },
    });
  });
});
