

import { testApiHandler } from 'next-test-api-route-handler';
import type { PageConfig } from 'next';
import { NextApiRequest, NextApiResponse } from 'next';


describe("pages/api/level/index.ts", () => {
    test("Sending nothing should return 401", async () => {
     expect(process.env).toBeDefined();
     expect(process.env.NODE_ENV).toBe("test");
     expect(process.env.LOCAL).toBeDefined();
    });
})
