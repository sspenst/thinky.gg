import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import TestId from '../../../../constants/testId';
import { logger } from '../../../../helpers/logger';
import { HomepageDataType } from '../../../../hooks/useHomePageData';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import homeHandler from '../../../../pages/api/home';

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

describe('pages/api/home.ts', () => {
  test('GET no query', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {},
        } as unknown as NextApiRequestWithAuth;

        await homeHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.latestLevels).toBeUndefined();
        expect(response.latestReviews).toBeUndefined();
        expect(response.levelOfDay).toBeUndefined();
        expect(response.recommendedLevel).toBeUndefined();
        expect(response.topLevelsThisMonth).toBeUndefined();

        expect(res.status).toBe(200);
      },
    });
  });
  test('GET partial query', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            [HomepageDataType.LatestLevels]: '1',
          },
        } as unknown as NextApiRequestWithAuth;

        await homeHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.latestLevels).toHaveLength(1);
        expect(response.latestReviews).toBeUndefined();
        expect(response.levelOfDay).toBeUndefined();
        expect(response.recommendedLevel).toBeUndefined();
        expect(response.topLevelsThisMonth).toBeUndefined();

        expect(res.status).toBe(200);
      },
    });
  });
  test('GET all', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            [HomepageDataType.LatestLevels]: '1',
            [HomepageDataType.LatestReviews]: '1',
            [HomepageDataType.LevelOfDay]: '1',
            [HomepageDataType.RecommendedLevel]: '1',
            [HomepageDataType.TopLevelsThisMonth]: '1',
          },
        } as unknown as NextApiRequestWithAuth;

        await homeHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.latestLevels).toHaveLength(1);
        expect(response.latestReviews).toHaveLength(1);
        expect(response.levelOfDay).not.toBeNull(); // we don't have any levels normally here but we reach the conditional where we just grab the most recently created level since we are out of levels
        expect(response.recommendedLevel).toBeNull(); // no recommended easy level even though we asked for it
        expect(response.topLevelsThisMonth).toHaveLength(3);

        expect(res.status).toBe(200);
      },
    });
  });
});
