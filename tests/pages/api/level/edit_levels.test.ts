import { ObjectId } from 'bson';
import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import TestId from '../../../../constants/testId';
import { logger } from '../../../../helpers/logger';
import { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import Level from '../../../../models/db/level';
import { LevelModel } from '../../../../models/mongoose';
import getCollectionHandler from '../../../../pages/api/collection-by-id/[id]';
import editLevelHandler from '../../../../pages/api/edit/[id]';
import modifyLevelHandler from '../../../../pages/api/level/[id]';
import createLevelHandler from '../../../../pages/api/level/index';
import publishLevelHandler from '../../../../pages/api/publish/[id]';
import statsHandler from '../../../../pages/api/stats/index';

let level_id_1: string;
let level_id_2: string;
let level_id_3: string;

afterEach(() => {
  jest.restoreAllMocks();
});
afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();

describe('Editing levels should work correctly', () => {
  test('Creating 3 levels where 1 is draft should only show 2 in collection', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            authorNote: 'I\'m a nice little note.',
            name: 'A Test Level',
            collectionIds: [TestId.COLLECTION],
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
        level_id_1 = response._id;
        expect(res.status).toBe(200);
      },
    });

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            authorNote: 'I\'m a mean little note.',
            name: 'A Second Test Level',
            collectionIds: [TestId.COLLECTION],
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
        level_id_2 = response._id;
        expect(res.status).toBe(200);
      },
    });

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            authorNote: 'I\'m a DRAFT buddy.',
            name: 'A Third Test Level (Draft)',
            collectionIds: [TestId.COLLECTION],
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
        level_id_3 = response._id;
        expect(res.status).toBe(200);
      },
    });
  });
  test('now we should be able to get the draft level', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: level_id_3,
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.authorNote).toBe('I\'m a DRAFT buddy.');
        expect(response.name).toBe('A Third Test Level (Draft)');
        expect(response._id).toBe(level_id_3);
        expect(res.status).toBe(200);
      },
    });
  });
  test('querying the collection should NOT show the levels in the level_ids array, since we have not published them yet', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.COLLECTION,
          },
        } as unknown as NextApiRequestWithAuth;

        await getCollectionHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();
        const response_ids = response.levels.map((level: Level) => level._id);

        // We have not published any of these yet, this happens after
        expect(response_ids).not.toContain(level_id_1);
        expect(response_ids).not.toContain(level_id_2);
        expect(response_ids).not.toContain(level_id_3);
        // only contain the 1 from initializeLocalDb
        expect(response.levels.length).toBe(1);
        expect(res.status).toBe(200);
      },
    });
  });
  test('Attempt to publish a level before a move count has been set', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: level_id_1,
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

        expect(response.error).toBe(
          'You must set a move count before publishing'
        );
      },
    });
  });
  test('Testing edit level but using wrong http method', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            data: '40000\n12000\n05000\n67890\nABCD3',
            width: 5,
            height: 5,
          },
          query: {
            id: level_id_1,
          },
        } as unknown as NextApiRequestWithAuth;

        await editLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Method not allowed');
        expect(res.status).toBe(405);
      },
    });
  });
  test('Testing edit level but using malformed data', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            data: true,
            width: 'a',
            height: 'b',
          },
          query: {
            id: 'aaa',
          },
        } as unknown as NextApiRequestWithAuth;

        await editLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Invalid body.data, body.height, body.width, query.id');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Testing edit level but level does not exist', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            data: '40000\n12000\n05000\n67890\nABCD3',
            width: 5,
            height: 5,
          },
          query: {
            id: new ObjectId().toString()
          },
        } as unknown as NextApiRequestWithAuth;

        await editLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Level not found');
        expect(res.status).toBe(404);
      },
    });
  });
  test('Testing edit level but this user does not own the level', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          body: {
            data: '40000\n12000\n05000\n67890\nABCD3',
            width: 5,
            height: 5,
          },
          query: {
            id: level_id_1,
          },
        } as unknown as NextApiRequestWithAuth;

        await editLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Not authorized to edit this Level');
        expect(res.status).toBe(401);
      },
    });
  });
  test('Step 1/3 steps to publish, first we have to submit a PUT request to change the level data, then publish.', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            data: '40000\n12000\n05000\n67890\nABCD3',
            width: 5,
            height: 5,
          },
          query: {
            id: level_id_1,
          },
        } as unknown as NextApiRequestWithAuth;

        await editLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response._id).toBe(level_id_1);
        expect(res.status).toBe(200);
      },
    });
  });
  test('Now submit the moves count', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            levelId: level_id_1,
            codes: [
              'ArrowRight',
              'ArrowRight',
              'ArrowRight',
              'ArrowRight',
              'ArrowDown',
              'ArrowDown',
              'ArrowDown',
              'ArrowDown',
            ],
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
      },
    });
  });
  test('Step 2A/3 to publish. First make sure we can\'t publish a duplicate level (this level data is same as one from init db)', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: level_id_1,
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

        expect(response.error).toBe('An identical level already exists');
      },
    });
  });
  test('Test 2B/3 to publish. Tweak level data slightly', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            data: '40000\n12000\n05000\n67890\n0BCD3',
            width: 5,
            height: 5,
          },
          query: {
            id: level_id_1,
          },
        } as unknown as NextApiRequestWithAuth;

        await editLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response._id).toBe(level_id_1);
        expect(res.status).toBe(200);
      },
    });
  });
  test('Step 2C/3 of publishing level. Republish solution', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            levelId: level_id_1,
            codes: [
              'ArrowRight',
              'ArrowRight',
              'ArrowRight',
              'ArrowRight',
              'ArrowDown',
              'ArrowDown',
              'ArrowDown',
              'ArrowDown',
            ],
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
      },
    });
  });
  test('Step 3/3 of publishing level. Now we should publish level successfully', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: level_id_1,
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

        expect(response.error).toBeUndefined();
        expect(response.updated).toBe(true);

        const level = await LevelModel.findById(level_id_1) as Level;

        expect(level.isDraft).toBe(false);
        expect(level.calc_difficulty_estimate).toBe(0);
        expect(level.calc_playattempts_duration_sum).toBe(0);
        expect(level.calc_stats_players_beaten).toBe(1);
        expect(level.calc_playattempts_unique_users).toHaveLength(0);
        expect(level.calc_playattempts_count).toBe(0);
        expect(level.calc_playattempts_just_beaten_count).toBe(0);
        expect(level.calc_reviews_count).toBe(0);
        expect(level.calc_reviews_score_laplace.toFixed(2)).toBe('0.67');
      },
    });
  });
  test('Editing a published level should fail', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            data: '40000\n12000\n05000\n67890\nABCD3',
            width: 5,
            height: 5,
          },
          query: {
            id: level_id_1,
          },
        } as unknown as NextApiRequestWithAuth;

        await editLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Cannot edit a published level');
        expect(res.status).toBe(400);
      },
    });
  });

  test('Querying the collection SHOULD show the recently published level in the level_ids array', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.COLLECTION,
          },
        } as unknown as NextApiRequestWithAuth;

        await getCollectionHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();
        const response_ids = response.levels.map((level: Level) => level._id);

        expect(response.levels[0].userId.name).toBe('test');
        expect(response_ids).toContain(level_id_1); // just published
        expect(response_ids).not.toContain(level_id_2);
        expect(response_ids).not.toContain(level_id_3);
        // only contain the 1 from initializeLocalDb + 1 new published
        expect(response.levels.length).toBe(2);
        expect(res.status).toBe(200);
      },
    });
  });
});
