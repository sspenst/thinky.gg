import createLevelHandler from "../../../pages/api/level/index";
import getLevelHandler from "../../../pages/api/level/[id]";
import { testApiHandler } from "next-test-api-route-handler";
import type { PageConfig } from "next";
import { NextApiRequest, NextApiResponse } from "next";
import { NextApiRequestWithAuth } from "../../../lib/withAuth";
import getTokenCookie from "../../../lib/getTokenCookie";
import { ObjectId } from "bson";

const USER_ID_FOR_TESTING = "600000000000000000000000";
const WORLD_ID_FOR_TESTING = "600000000000000000000001";
function getLoginToken(host: any) {
  // get host from env
  let token = getTokenCookie(USER_ID_FOR_TESTING, host);
  // token is now of the form token=TOKE; we need to strip the token
  // out of the cookie
  let tokenCookie = token.split("=")[1];
  // now we need to strip the ; off the end
  // now we need to get up to the semicolon
  let tokenCookieNoSemi = tokenCookie.split(";")[0];
  return tokenCookieNoSemi;

  //getTokenCookie(user._id.toString(), req.headers.host);
}
describe("pages/api/level/index.ts", () => {
  test("Sending nothing should return 401", async () => {
    await testApiHandler({
      handler: (_, res) => {
        const req: NextApiRequestWithAuth = {
          cookies: {
            token: "",
          },
        } as unknown as NextApiRequestWithAuth;
        createLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        expect(res.status).toBe(401);
      },
    });
  });

  test("Doing a POST with no level data should error", async () => {
    await testApiHandler({
      handler: (qr, res) => {
        const req: NextApiRequestWithAuth = {
          method: "POST",
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getLoginToken(qr.headers.host),
          },
        } as unknown as NextApiRequestWithAuth;
        createLevelHandler(req, res);
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
      handler: (qr, res) => {
        const req: NextApiRequestWithAuth = {
          method: "POST",
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getLoginToken(qr.headers.host),
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
        createLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();
        expect(response.success).toBe(true);
        level_id = response.id;
        expect(res.status).toBe(200);
      },
    });

    // now we should be able to get the level
    await testApiHandler({
      handler: (qr, res) => {
        const req: NextApiRequestWithAuth = {
          method: "GET",
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getLoginToken(qr.headers.host),
          },
          query: {
            id: level_id,
          },
        } as unknown as NextApiRequestWithAuth;
        getLevelHandler(req, res);
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
      handler: (qr, res) => {
        const req: NextApiRequestWithAuth = {
          method: "GET",
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getLoginToken(qr.headers.host),
          },
          query: {
            id: new ObjectId(), // shouldn't exist
          },
        } as unknown as NextApiRequestWithAuth;
        getLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();
        expect(res.status).toBe(404);
      },
    });
  });
});
