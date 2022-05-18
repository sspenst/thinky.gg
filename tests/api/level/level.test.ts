import { NextApiRequestWithAuth } from "../../../lib/withAuth";
import { ObjectId } from "bson";
import createLevelHandler from "../../../pages/api/level/index";
import { dbDisconnect } from "../../../lib/dbConnect";
import getLevelHandler from "../../../pages/api/level/[id]";
import { getTokenCookieValue } from "../../../lib/getTokenCookie";
import { testApiHandler } from "next-test-api-route-handler";

const USER_ID_FOR_TESTING = "600000000000000000000000";
const WORLD_ID_FOR_TESTING = "600000000000000000000001";

afterAll(async () => {
  await dbDisconnect();
});

describe("pages/api/level/index.ts", () => {
  test("Sending nothing should return 401", async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          cookies: {
            token: "",
          },
        } as unknown as NextApiRequestWithAuth;
        await createLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        expect(res.status).toBe(401);
      },
    });
  });

  test("Doing a POST with no level data should error", async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: "POST",
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
        } as unknown as NextApiRequestWithAuth;
        await createLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();
        expect(response.error).toBe("Missing required fields");
        expect(res.status).toBe(400);
      },
    });
  });

  test("Doing a POST with level data should be OK", async () => {
    let level_id: string;
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
            worldId: WORLD_ID_FOR_TESTING,
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
        level_id = response._id;
        expect(res.status).toBe(200);
      },
    });

    // now we should be able to get the level
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: "GET",
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: level_id,
          },
        } as unknown as NextApiRequestWithAuth;
        await getLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();
        expect(response.authorNote).toBe("I'm a nice little note.");
        expect(response.name).toBe("A Test Level");
        expect(response.worldId._id).toBe(WORLD_ID_FOR_TESTING);
        expect(response._id).toBe(level_id);
        expect(res.status).toBe(200);
      },
    });

    // getting a different level id shouldn't return anything
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: "GET",
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: new ObjectId(), // shouldn't exist
          },
        } as unknown as NextApiRequestWithAuth;
        await getLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        expect(res.status).toBe(404);
      },
    });
  });
});
