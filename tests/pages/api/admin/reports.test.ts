import { ReportReason } from '@root/constants/ReportReason';
import { ReportStatus } from '@root/constants/ReportStatus';
import Role from '@root/constants/role';
import TestId from '@root/constants/testId';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { ReportModel } from '@root/models/mongoose';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import handler from '../../../../pages/api/admin/reports';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('/api/admin/reports', () => {
  describe('GET', () => {
    test('should return reports for admin', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'GET',
            cookies: {
              token: getTokenCookieValue(TestId.USER_ADMIN)
            },
            query: {
              page: '1',
              limit: '10'
            },
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await handler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const resData = await res.json();

          expect(res.status).toBe(200);
          expect(resData.reports).toBeDefined();
          expect(resData.pagination).toBeDefined();
          expect(Array.isArray(resData.reports)).toBe(true);
        },
      });
    });

    test('should return 401 for non-admin', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'GET',
            cookies: {
              token: getTokenCookieValue(TestId.USER_B)
            },
            query: {
              page: '1',
              limit: '10'
            },
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await handler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const resData = await res.json();

          expect(res.status).toBe(401);
          expect(resData.error).toBe('Not authorized');
        },
      });
    });
  });

  describe('PUT', () => {
    test('should close report successfully', async () => {
      // Create a test report first
      const testReport = await ReportModel.create({
        reporter: new Types.ObjectId(TestId.USER_B),
        reportedUser: new Types.ObjectId(TestId.USER_C),
        reportedEntity: new Types.ObjectId(TestId.LEVEL),
        reportedEntityModel: 'Level',
        reasonType: ReportReason.HARASSMENT,
        message: 'Test report message',
        status: ReportStatus.OPEN,
        gameId: 'pathology',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'PUT',
            cookies: {
              token: getTokenCookieValue(TestId.USER_ADMIN)
            },
            body: {
              reportId: testReport._id.toString(),
              statusReason: 'resolved - content reviewed and no violation found'
            },
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await handler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const resData = await res.json();

          expect(res.status).toBe(200);
          expect(resData.success).toBe(true);

          // Verify report was updated
          const updatedReport = await ReportModel.findById(testReport._id);

          expect(updatedReport?.status).toBe(ReportStatus.CLOSED);
          expect(updatedReport?.statusReason).toBe('resolved - content reviewed and no violation found');
        },
      });

      // Clean up
      await ReportModel.findByIdAndDelete(testReport._id);
    });

    test('should return 401 for non-admin', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'PUT',
            cookies: {
              token: getTokenCookieValue(TestId.USER_B)
            },
            body: {
              reportId: new Types.ObjectId().toString(),
              statusReason: 'test reason'
            },
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await handler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const resData = await res.json();

          expect(res.status).toBe(401);
          expect(resData.error).toBe('Not authorized');
        },
      });
    });
  });
});
