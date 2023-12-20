import TestId from '@root/constants/testId';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { UserConfigModel } from '@root/models/mongoose';
import userHandler from '@root/pages/api/user/index';
import { testApiHandler } from 'next-test-api-route-handler';

export async function createAnotherGameConfig(userId: string) {
  await testApiHandler({
    handler: async (_, res) => {
      const req: NextApiRequestWithAuth = {
        method: 'GET',
        cookies: {
          token: getTokenCookieValue(TestId.USER),
        },
        headers: {
          'content-type': 'application/json',
          'host': 'sokoban.localhost',
        },
      } as unknown as NextApiRequestWithAuth;

      await userHandler(req, res);
    },
    test: async ({ fetch }) => {
      const res = await fetch();
      const response = await res.json();

      expect(response.error).toBeUndefined();
      expect(res.status).toBe(200);
      const u = await UserConfigModel.find({ userId: TestId.USER });

      expect(u.length).toBe(2);
    }
  });
}
