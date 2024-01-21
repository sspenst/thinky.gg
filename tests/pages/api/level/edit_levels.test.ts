import AchievementType from '@root/constants/achievements/achievementType';
import Direction from '@root/constants/direction';
import { DEFAULT_GAME_ID, GameId } from '@root/constants/GameId';
import { enableFetchMocks } from 'jest-fetch-mock';
import { Types, UpdateQuery } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import TestId from '../../../../constants/testId';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import Level from '../../../../models/db/level';
import { AchievementModel, LevelModel, QueueMessageModel, UserConfigModel } from '../../../../models/mongoose';
import getCollectionHandler from '../../../../pages/api/collection-by-id/[id]';
import editLevelHandler from '../../../../pages/api/edit/[id]';
import { processQueueMessages } from '../../../../pages/api/internal-jobs/worker';
import modifyLevelHandler from '../../../../pages/api/level/[id]';
import createLevelHandler from '../../../../pages/api/level/index';
import publishLevelHandler from '../../../../pages/api/publish/[id]';
import saveToCollectionHandler from '../../../../pages/api/save-to-collection/[id]';
import statsHandler from '../../../../pages/api/stats/index';
import unpublishLevelHandler from '../../../../pages/api/unpublish/[id]';
import { createAnotherGameConfig } from '../helper';

let level_id_1: string;
let level_id_2: string;
let level_id_3: string;

afterEach(() => {
  jest.restoreAllMocks();
});
beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();

describe('Editing levels should work correctly', () => {
  test('Create another userconfig profile for another game', async () => {
    await createAnotherGameConfig(TestId.USER, GameId.SOKOPATH);
  });
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
            name: 'test level 1',
            data: '4000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000003',
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
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: level_id_1.toString(),
          },
          body: {
            collectionIds: [TestId.COLLECTION],
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await saveToCollectionHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response._id).toBe(level_id_1.toString());
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
            data: '4000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000003',
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
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: level_id_2.toString(),
          },
          body: {
            collectionIds: [TestId.COLLECTION],
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await saveToCollectionHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response._id).toBe(level_id_2.toString());
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
            data: '4000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000003',
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
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: level_id_3.toString(),
          },
          body: {
            collectionIds: [TestId.COLLECTION],
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await saveToCollectionHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response._id).toBe(level_id_3.toString());
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
            id: new Types.ObjectId().toString()
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
            data: '4000B0\n120000\n050000\n678900\nABCD30',
            width: 6,
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
        const lvl = await LevelModel.findById(level_id_1);

        expect(lvl?.data).toBe('4000B0\n120000\n050000\n678900\nABCD30');
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
            directions: [
              Direction.RIGHT,
              Direction.RIGHT,
              Direction.RIGHT,
              Direction.RIGHT,
              Direction.DOWN,
              Direction.DOWN,
              Direction.DOWN,
              Direction.DOWN,
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
  test('Try publishing invalid levels', async () => {
    const invalidLevels = [
      [{ data: '00000' }, 'Must have exactly one player, Must have at least one exit'],
      [{ data: '40000' }, 'Must have at least one exit'],
      [{ data: '40003', leastMoves: 40000 }, 'Move count cannot be greater than 2500']
    ];

    for (const levelTest of invalidLevels) {
      await LevelModel.findByIdAndUpdate(level_id_1, levelTest[0] as UpdateQuery<Level>);
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

          expect(response.error).toBeDefined();
          expect(response.error).toBe(levelTest[1]);
          expect(res.status).toBe(400);
        },
      });
    }
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
            data: '40000\n12000\n05000\n67890\n0BCD3\n\n\n',
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

        const level1 = await LevelModel.findById(level_id_1);

        expect(level1.data).toBe('40000\n12000\n05000\n67890\n0BCD3');
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
            directions: [
              Direction.RIGHT,
              Direction.RIGHT,
              Direction.RIGHT,
              Direction.RIGHT,
              Direction.DOWN,
              Direction.DOWN,
              Direction.DOWN,
              Direction.DOWN,
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
  test('Step 2D of publish. Make sure we can\'t publish a level with an existing name', async () => {
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

        expect(response.error).toBe('A level with this name already exists');
      },
    });
  });
  test('Step 2/E of publishing level. Now we should publish but have it error on db during queuing, session should handle things properly', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(QueueMessageModel, 'updateOne').mockImplementationOnce(() => {
      throw new Error('Test error');
    });
    await LevelModel.updateOne({ _id: level_id_1 }, { name: 'A Test Level' });

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

        await processQueueMessages();
        expect(response.error).toBe('Error in publishing level');

        const level = await LevelModel.findById(level_id_1) as Level;

        expect(level.isDraft).toBe(true);
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

        await processQueueMessages();

        // check queue messages for the achievement message

        // check to see if we earned an achievement
        const achievements = await AchievementModel.find({ userId: new Types.ObjectId(TestId.USER) });

        expect(achievements.length).toBe(1);
        expect(achievements[0].gameId).toBe(DEFAULT_GAME_ID);
        expect(achievements[0].type).toBe(AchievementType.CREATOR_CREATED_1_LEVEL);
        // expect(achievements[1].type).toBe(AchievementType.CREATOR_CREATED_5_LEVELS); // Note that this is not earned yet, 7 levels created but they aren't quality

        expect(response.error).toBeUndefined();
        expect(response._id).toBe(level_id_1);

        const level = await LevelModel.findById(level_id_1) as Level;

        expect(level.isDraft).toBe(false);
        expect(level.isRanked).toBe(false);
        expect(level.calc_difficulty_estimate).toBe(-1);
        expect(level.calc_playattempts_duration_sum).toBe(0);
        expect(level.calc_stats_players_beaten).toBe(1);
        expect(level.calc_playattempts_unique_users).toHaveLength(0);
        expect(level.calc_playattempts_just_beaten_count).toBe(0);
        expect(level.calc_reviews_count).toBe(0);
        expect(level.calc_reviews_score_laplace.toFixed(2)).toBe('0.67');
      },
    });
  });
  test('Publish level that doesnt exist', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: new Types.ObjectId(),
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
        expect(response.error).toBe('Level not found');
        expect(res.status).toBe(404);
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

        expect(res.status).toBe(200);
      },
    });
  });
  test('Unpublishing the level', async () => {
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

        await unpublishLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        await processQueueMessages();
        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response.updated).toBe(true);
      },
    });
  });

  test('after everything, expect that the userconfig for the other game has not changed values', async () => {
    let u = await UserConfigModel.findOne({ userId: TestId.USER, gameId: GameId.SOKOPATH });

    expect(u).toBeDefined();
    expect(u?.calcLevelsCreatedCount).toEqual(0);
    expect(u?.calcRecordsCount).toEqual(0);
    expect(u?.calcLevelsSolvedCount).toEqual(0);
    expect(u?.calcRecordsCount).toEqual(0);
    u = await UserConfigModel.findOne({ userId: TestId.USER_B, gameId: DEFAULT_GAME_ID });

    expect(u).toBeDefined();
    expect(u?.calcLevelsCreatedCount).toEqual(0);
    expect(u?.calcRecordsCount).toEqual(0);
    expect(u?.calcLevelsSolvedCount).toEqual(0);
    expect(u?.calcRecordsCount).toEqual(0);
  });
});
