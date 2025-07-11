import NotificationType from '@root/constants/notificationType';
import { ReportStatus } from '@root/constants/ReportStatus';
import Role from '@root/constants/role';
import { ValidEnum, ValidObjectId, ValidType } from '@root/helpers/apiWrapper';
import { logger } from '@root/helpers/logger';
import { createNewAdminMessageNotifications } from '@root/helpers/notificationHelper';
import withAuth, { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { USER_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import { Report } from '@root/models/db/report';
import { CommentModel, LevelModel, ReportModel, ReviewModel, UserModel } from '@root/models/mongoose';
import mongoose, { Types } from 'mongoose';
import { NextApiResponse } from 'next';

interface ReportsQueryProps {
  page?: number;
  limit?: number;
  status?: ReportStatus;
}

interface CloseReportBodyProps {
  reportId: string;
  statusReason: string;
}

export default withAuth({
  GET: {
    query: {
      page: ValidType('string', false),
      limit: ValidType('string', false),
      status: ValidEnum(Object.values(ReportStatus), false),
    }
  },
  PUT: {
    body: {
      reportId: ValidObjectId(true),
      statusReason: ValidType('string', true),
    }
  }
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (!req.user.roles.includes(Role.ADMIN)) {
    return res.status(401).json({
      error: 'Not authorized'
    });
  }

  if (req.method === 'GET') {
    const { page: pageStr = '1', limit: limitStr = '20', status } = req.query as ReportsQueryProps;
    const page = parseInt(pageStr as string, 10) || 1;
    const limit = parseInt(limitStr as string, 10) || 20;
    const skip = (page - 1) * limit;

    try {
      // Build match criteria
      const matchCriteria: any = {};

      if (status) {
        matchCriteria.status = status;
      }

      // Get reports with enriched data
      const reportsAgg = await ReportModel.aggregate([
        { $match: matchCriteria },
        // Lookup reporter info
        {
          $lookup: {
            from: UserModel.collection.name,
            localField: 'reporter',
            foreignField: '_id',
            as: 'reporter',
            pipeline: [
              { $project: USER_DEFAULT_PROJECTION }
            ]
          }
        },
        { $unwind: { path: '$reporter', preserveNullAndEmptyArrays: true } },
        // Lookup reported user info
        {
          $lookup: {
            from: UserModel.collection.name,
            localField: 'reportedUser',
            foreignField: '_id',
            as: 'reportedUser',
            pipeline: [
              { $project: USER_DEFAULT_PROJECTION }
            ]
          }
        },
        { $unwind: { path: '$reportedUser', preserveNullAndEmptyArrays: true } },
        // Sort by creation date (newest first)
        { $sort: { createdAt: -1 } },
        // Pagination
        { $skip: skip },
        { $limit: limit },
      ]);

      // Get total count for pagination
      const totalCount = await ReportModel.countDocuments(matchCriteria);

      // Get report count per user (how many times each reported user has been reported)
      const reportCountsAgg = await ReportModel.aggregate([
        { $group: { _id: '$reportedUser', count: { $sum: 1 } } }
      ]);

      const reportCounts = reportCountsAgg.reduce((acc, item) => {
        acc[item._id.toString()] = item.count;

        return acc;
      }, {} as Record<string, number>);

      // Enrich reports with entity details and report counts
      const enrichedReports = await Promise.all(reportsAgg.map(async (report) => {
        let entityDetails = null;

        try {
          switch (report.reportedEntityModel) {
          case 'Level':
            entityDetails = await LevelModel.findById(report.reportedEntity, 'name slug').lean();
            break;
          case 'Comment':
            entityDetails = await CommentModel.findById(report.reportedEntity, 'text target').lean();
            break;
          case 'Review':
            entityDetails = await ReviewModel.findById(report.reportedEntity, 'text score').lean();
            break;
          }
        } catch (error) {
          logger.error('Error fetching entity details:', error);
        }

        return {
          ...report,
          entityDetails,
          reportedUserTotalReports: reportCounts[report.reportedUser?._id.toString()] || 0
        };
      }));

      return res.status(200).json({
        reports: enrichedReports,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      logger.error('Error fetching reports:', error);

      return res.status(500).json({ error: 'Failed to fetch reports' });
    }
  } else if (req.method === 'PUT') {
    const { reportId, statusReason } = req.body as CloseReportBodyProps;

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        // Update the report status
        const report = await ReportModel.findByIdAndUpdate(
          reportId,
          {
            status: ReportStatus.CLOSED,
            statusReason: statusReason.trim()
          },
          { new: true, session }
        ).populate('reporter').lean<Report>();

        if (!report) {
          throw new Error('Report not found');
        }

        // Send admin notification to the reporter about the resolution
        const notificationMessage = `Your report has been reviewed with following outcome: ${statusReason.toLowerCase()}.`;

        await createNewAdminMessageNotifications(
          req.gameId,
          [new Types.ObjectId(report.reporter._id)],
          JSON.stringify({
            message: notificationMessage,
            href: undefined
          }),
          session
        );
      });

      session.endSession();

      return res.status(200).json({ success: true });
    } catch (error) {
      logger.error('Error closing report:', error);
      session.endSession();

      return res.status(500).json({ error: 'Failed to close report' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
