import { ReportReason } from '@root/constants/ReportReason';
import { ReportType } from '@root/constants/ReportType';
import { logger } from '@root/helpers/logger';
import handler from '@root/pages/api/report/index';
import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import TestId from '../../../../constants/testId';
import queueDiscordWebhook from '../../../../helpers/discordWebhook';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';

// Mock queueDiscordWebhook
jest.mock('../../../../helpers/discordWebhook', () => jest.fn());

beforeAll(async () => {
  await dbConnect();
});
afterEach(() => {
  jest.clearAllMocks();
});
afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();

describe('pages/api/report/index.ts', () => {
  const TEST_REPORT_REVIEW = {
    targetId: TestId.REVIEW,
    reportReason: ReportReason.HARASSMENT,
    reportType: ReportType.REVIEW,
    message: 'This is a test report',
  };

  test('POST report a comment', async () => {
    await testApiHandler({
      pagesHandler: async (req, res) => {
        req.method = 'POST';
        req.cookies = {
          token: getTokenCookieValue(TestId.USER),
        };
        req.body = {
          ...TEST_REPORT_REVIEW
        };
        req.headers = {
          'content-type': 'application/json',
        };

        await handler(req as NextApiRequestWithAuth, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response.success).toBe(true);

        // Assert that queueDiscordWebhook was called with the expected arguments
        expect(queueDiscordWebhook).toHaveBeenCalledWith(
          expect.any(String),
          expect.stringContaining('User test reported a Review by user BBB for reason HARASSMENT with message: This is a test report. [Link](https://pathology'),
        );
      },
    });
  });
  test('POST report the same comment by the same user should ERROR', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    await testApiHandler({
      pagesHandler: async (req, res) => {
        req.method = 'POST';
        req.cookies = {
          token: getTokenCookieValue(TestId.USER),
        };
        req.body = {
          ...TEST_REPORT_REVIEW
        };
        req.headers = {
          'content-type': 'application/json',
        };

        await handler(req as NextApiRequestWithAuth, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(400);
        expect(response.error).toBe('You have already reported this. Please wait for it to be reviewed.');
      },
    });
  });
  test('POST report same comment but different user should be OK', async () => {
    await testApiHandler({
      pagesHandler: async (req, res) => {
        req.method = 'POST';
        req.cookies = {
          token: getTokenCookieValue(TestId.USER_C),
        };
        req.body = {
          ...TEST_REPORT_REVIEW
        };
        req.headers = {
          'content-type': 'application/json',
        };

        await handler(req as NextApiRequestWithAuth, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response.success).toBe(true);

        // Assert that queueDiscordWebhook was called with the expected arguments
        expect(queueDiscordWebhook).toHaveBeenCalledWith(
          expect.any(String),
          expect.stringContaining('User Curator reported a Review by user BBB for reason HARASSMENT with message: This is a test report. [Link](https://pathology'),
        );
      },
    });
  });
});
