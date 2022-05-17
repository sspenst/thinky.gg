import createWorldHandler from "../../../pages/api/world/index";
import getWorldHandler from "../../../pages/api/world-by-id/[id]";
import { testApiHandler } from "next-test-api-route-handler";
import type { PageConfig } from "next";
import { NextApiRequest, NextApiResponse } from "next";
import { NextApiRequestWithAuth } from "../../../lib/withAuth";
import getTokenCookie from "../../../lib/getTokenCookie";
import world from "../../../pages/api/world/index";
import { ObjectId } from "bson";

const USER_ID_FOR_TESTING = "600000000000000000000000";
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
describe("pages/api/world/index.ts", () => {
  test("Sending nothing should return 401", async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          cookies: {
            token: "",
          },
        } as unknown as NextApiRequestWithAuth;
        await createWorldHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        expect(res.status).toBe(401);
      },
    });
  });

  test("Doing a POST with no data should error", async () => {
    await testApiHandler({
      handler: async (qr, res) => {
        const req: NextApiRequestWithAuth = {
          method: "POST",
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getLoginToken(qr.headers.host),
          },
        } as unknown as NextApiRequestWithAuth;
        await createWorldHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();
        expect(response.error).toBe("Missing required fields");
        expect(res.status).toBe(400);
      },
    });
  });

  test("Doing a POST with world data should be OK", async () => {
    let world_id: string;
    await testApiHandler({
      handler: async (qr, res) => {
        const req: NextApiRequestWithAuth = {
          method: "POST",
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getLoginToken(qr.headers.host),
          },
          body: {
            authorNote: "I'm a nice little world note.",
            name: "A Test World",
          },
          headers: {
            "content-type": "application/json",
          },
        } as unknown as NextApiRequestWithAuth;
        await createWorldHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();
        expect(response.error).toBeUndefined();
        expect(response.success).toBeUndefined();
        world_id = response._id;
        expect(res.status).toBe(200);
      },
    });

    // now we should be able to get the level
    await testApiHandler({
      handler: async (qr, res) => {
        const req: NextApiRequestWithAuth = {
          method: "GET",
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getLoginToken(qr.headers.host),
          },
          query: {
            id: world_id,
          },
        } as unknown as NextApiRequestWithAuth;
        await getWorldHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();
        expect(response.authorNote).toBe("I'm a nice little world note.");
        expect(response.name).toBe("A Test World");
        expect(response._id).toBe(world_id);
        expect(res.status).toBe(200);
      },
    });

    // now querying for a different world should NOT return this world
    await testApiHandler({
      handler: async (qr, res) => {
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
        await getWorldHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();
        expect(res.status).toBe(404);
      },
    });
  });
});
