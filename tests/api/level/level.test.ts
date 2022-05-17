
import withAuth  from '../../../pages/api/level/index'
import { testApiHandler } from 'next-test-api-route-handler';
import type { PageConfig } from 'next';
import { NextApiRequest, NextApiResponse } from 'next';
import { NextApiRequestWithAuth } from '../../../lib/withAuth';


describe("pages/api/level/index.ts", () => {
test("Sending nothing should return 401", async () => {
    await testApiHandler({
        handler: (_, res)=> {
            const req: NextApiRequestWithAuth = {cookies: {
                token: '',
            }} as unknown as NextApiRequestWithAuth;
            withAuth(req,res)
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          expect(res.status).toBe(401);
        }
      });
    });
})
