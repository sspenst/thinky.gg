import Level from '../../../../models/db/level';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import createLevelHandler from '../../../../pages/api/level/index';
import { dbDisconnect } from '../../../../lib/dbConnect';
import editLevelHandler from '../../../../pages/api/edit/[id]';
import { enableFetchMocks } from 'jest-fetch-mock';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import getWorldHandler from '../../../../pages/api/world-by-id/[id]';
import modifyLevelHandler from '../../../../pages/api/level/[id]';
import publishLevelHandler from '../../../../pages/api/publish/[id]';
import statsHandler from '../../../../pages/api/stats/index';
import { testApiHandler } from 'next-test-api-route-handler';

const USER_ID_FOR_TESTING = '600000000000000000000000';
const WORLD_ID_FOR_TESTING = '600000000000000000000001';
let level_id_1: string;
let level_id_2: string;
let level_id_3: string;

afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();

describe('Draft levels should not show for users to play', () => {
  test('Creating 3 levels where 1 is draft should only show 2 in world', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {
            authorNote: 'I\'m a nice little note.',
            name: 'A Test Level',
            points: 0,
            worldIds: [WORLD_ID_FOR_TESTING],
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
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {
            authorNote: 'I\'m a mean little note.',
            name: 'A Second Test Level',
            points: 0,
            worldIds: [WORLD_ID_FOR_TESTING],
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
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {
            authorNote: 'I\'m a DRAFT buddy.',
            name: 'A Third Test Level (Draft)',
            points: 0,
            worldIds: [WORLD_ID_FOR_TESTING],
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
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
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
  test('querying the world should NOT show the levels in the level_ids array, since we have not published them yet', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: WORLD_ID_FOR_TESTING,
          },
        } as unknown as NextApiRequestWithAuth;

        await getWorldHandler(req, res);
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
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
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
  test('Step 1/3 steps to publish, first we have to submit a PUT request to change the level data, then publish.', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
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
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
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
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
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
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
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
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
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
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
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
      },
    });
  });

  test('Querying the world SHOULD show the recently published level in the level_ids array', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: WORLD_ID_FOR_TESTING,
          },
        } as unknown as NextApiRequestWithAuth;

        await getWorldHandler(req, res);
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
