import { enableFetchMocks } from "jest-fetch-mock";
import { testApiHandler } from "next-test-api-route-handler";
import { dbDisconnect } from "../../../lib/dbConnect";
import { getTokenCookieValue } from "../../../lib/getTokenCookie";
import { NextApiRequestWithAuth } from "../../../lib/withAuth";
import createLevelHandler from "../../../pages/api/level/index";
import modifyLevelHandler from "../../../pages/api/level/[id]";
const USER_ID_FOR_TESTING = "600000000000000000000000";
const WORLD_ID_FOR_TESTING = "600000000000000000000001";
let level_id_1: string;
let level_id_2: string;
afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();

describe("Testing slugs for levels", () => {
  test("Creating a new level should create a slug", async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: "POST",
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {
            authorNote: "I'm a nice little note.",
            name: "A Test Level",
            points: 0,
            worldIds: [WORLD_ID_FOR_TESTING],
          },
          headers: {
            "content-type": "application/json",
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
          method: "GET",
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
        expect(response.slug).toBe("test/a-test-level");
        expect(response.name).toBe("A Test Level");
        expect(response._id).toBe(level_id_1);
        expect(res.status).toBe(200);
      },
    });
  });
  test("Editing the level should change the slug", async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: "PUT",
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {
            name: "I'm happy and I know it",
            points: 1,
            worldIds: [WORLD_ID_FOR_TESTING],
            authorNote: "I'm a nice little note OK.",
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
          method: "GET",
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
        expect(response.slug).toBe("test/i'm-happy-and-i-know-it");
        expect(response.name).toBe("I'm happy and I know it");
        expect(response.authorNote).toBe("I'm a nice little note OK.");
        expect(response._id).toBe(level_id_1);
        expect(res.status).toBe(200);
      },
    });
  });
});
