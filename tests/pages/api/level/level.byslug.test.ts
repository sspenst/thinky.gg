import Level from '../../../../models/db/level';
import { LevelModel } from '../../../../models/mongoose';
import { NextApiRequest } from 'next';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import createLevelHandler from '../../../../pages/api/level/index';
import { dbDisconnect } from '../../../../lib/dbConnect';
import { enableFetchMocks } from 'jest-fetch-mock';
import getLevelBySlugHandler from '../../../../pages/api/level-by-slug/[username]/[slugName]';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { initLevel } from '../../../../lib/initializeLocalDb';
import modifyLevelHandler from '../../../../pages/api/level/[id]';
import modifyUserHandler from '../../../../pages/api/user/index';
import { testApiHandler } from 'next-test-api-route-handler';

const USER_ID_FOR_TESTING = '600000000000000000000000';
const WORLD_ID_FOR_TESTING = '600000000000000000000001';
let level_id_1: string;
let level_id_2: string;

afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();
describe('Testing slugs for levels', () => {
  test('Creating a new level should create a slug', async () => {
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
          method: 'GET',
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

        await modifyLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.slug).toBe('test/a-test-level');
        expect(response.name).toBe('A Test Level');
        expect(response._id).toBe(level_id_1);
        expect(res.status).toBe(200);
      },
    });
  });
  test('Editing the level should change the slug', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {
            name: 'I\'m happy and I know it! Pt. </1]>',
            points: 1,
            worldIds: [WORLD_ID_FOR_TESTING],
            authorNote: 'I\'m a nice little note OK.',
          },
          query: {
            id: level_id_1,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
      },
    });
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
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

        await modifyLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.slug).toBe('test/im-happy-and-i-know-it-pt-1');
        expect(response.name).toBe('I\'m happy and I know it! Pt. </1]>');
        expect(response.authorNote).toBe('I\'m a nice little note OK.');
        expect(response._id).toBe(level_id_1);
        expect(res.status).toBe(200);
      },
    });
  });
  test('Slugs should still work with no alphanumeric characters', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {
            name: '<(~.~)>',
            points: 1,
            worldIds: [WORLD_ID_FOR_TESTING],
            authorNote: 'I\'m a nice little note OK.',
          },
          query: {
            id: level_id_1,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
      },
    });
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
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

        await modifyLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.slug).toBe('test/-');
        expect(response.name).toBe('<(~.~)>');
        expect(response.authorNote).toBe('I\'m a nice little note OK.');
        expect(response._id).toBe(level_id_1);
        expect(res.status).toBe(200);
      },
    });
  });
  test('Changing username (with capitals) shouldn\'t error', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {
            name: 'newUser',
            email: 'test@test.com',
            currentPassword: 'test',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.updated).toBe(true);
        expect(res.status).toBe(200);
      },
    });
  });
  test('After changing the username, all levels (including drafts) for the user should have the new username in it', async () => {
    const levels = await LevelModel.find<Level>(
      { userId: USER_ID_FOR_TESTING },
      'name slug userId'
    ).sort({ slug: 1 });

    expect(levels[0].userId.toString()).toBe(USER_ID_FOR_TESTING);
    expect(levels[1].userId.toString()).toBe(USER_ID_FOR_TESTING);
    expect(levels[2].userId.toString()).toBe(USER_ID_FOR_TESTING);
    expect(levels.length).toBe(3);
    expect(levels[0].slug).toBe('newuser/-');
    expect(levels[1].slug).toBe('newuser/test-level-1');
    expect(levels[2].slug).toBe('newuser/test-level-2');
  });
  test('Getting a level by slug when not logged in should work', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequest = {
          method: 'GET',
          query: {
            username: 'newuser',
            slugName: 'test-level-1',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await getLevelBySlugHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.slug).toBe('newuser/test-level-1');
        expect(response.name).toBe('test level 1');
        expect(response.authorNote).toBe('test level 1 author note');
        expect(res.status).toBe(200);
      },
    });
  });
  test('Getting an UNDRAFTED level by slug when not logged in should work', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequest = {
          method: 'GET',
          query: {
            id: 'newuser',
            slugName: 'i\'m-happy-and-i-know-it',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await getLevelBySlugHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Level not found');
        expect(res.status).toBe(404);
      },
    });
  });
  test('Creating a second level with a duplicate slug should append a number at the end of the slug', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {
            authorNote: 'Test level note draft',
            name: 'Test Level [1]', // This should generate a different slug that matches the others
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
  });
  test('Getting the slug for test-level-1 should still return the original level', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequest = {
          method: 'GET',
          query: {
            username: 'newuser',
            slugName: 'test-level-1',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await getLevelBySlugHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.slug).toBe('newuser/test-level-1');
        expect(response.name).toBe('test level 1');
        expect(response.authorNote).toBe('test level 1 author note');
        expect(res.status).toBe(200);
      },
    });
  });

  test('Updating level_id_2 name to test-level-2 should become test-level-2-2 in the db', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {
            name: 'test level (2)',
            points: 1,
            worldIds: [WORLD_ID_FOR_TESTING],
            authorNote: 'I\'m a nice little note OK.',
          },
          query: {
            id: level_id_2,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
      },
    });
    const level = await LevelModel.findById<Level>(level_id_2);

    // testing through querying DB since this level is a draft
    expect(level).toBeDefined();
    expect(level?.slug).toBe('newuser/test-level-2-2');
  });
  test('Create 98 levels with same name in DB, so that we can test to make sure the server will not crash. The 99th should crash however.', async () => {
    for (let i = 0; i < 98; i++) {
      // expect no exceptions
      const promise = initLevel(USER_ID_FOR_TESTING, 'Sample');

      await expect(promise).resolves.toBeDefined();
    }

    // Now create one more, it should throw exception
    const promise = initLevel(USER_ID_FOR_TESTING, 'Sample');

    await expect(promise).rejects.toThrow('Couldn\'t generate a unique slug');
  }, 30000);
});
