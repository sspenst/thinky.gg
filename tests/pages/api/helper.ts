import { GameId } from '@root/constants/GameId';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import userHandler from '@root/pages/api/user/index';
import { testApiHandler } from 'next-test-api-route-handler';

export async function createAnotherGameConfig(userId: string, gameId: GameId) {
  const host = gameId + '.localhost';

  await testApiHandler({
    handler: async (_, res) => {
      const req: NextApiRequestWithAuth = {
        method: 'GET',
        cookies: {
          token: getTokenCookieValue(userId),
        },
        headers: {
          'content-type': 'application/json',
          'host': host,
        },
      } as unknown as NextApiRequestWithAuth;

      await userHandler(req, res);
    },
    test: async ({ fetch }) => {
      const res = await fetch();
      const response = await res.json();

      expect(response.error).toBeUndefined();
      expect(res.status).toBe(200);
    }
  });
}
