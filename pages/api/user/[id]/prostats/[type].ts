import mongoose from 'mongoose';
import { NextApiResponse } from 'next';
import { ValidEnum } from '../../../../../helpers/apiWrapper';
import isPro from '../../../../../helpers/isPro';
import { ProStatsUserType } from '../../../../../hooks/useProStatsUser';
import withAuth, { NextApiRequestWithAuth } from '../../../../../lib/withAuth';
import { StatModel } from '../../../../../models/mongoose';

async function getScoreHistory(userId: string) {
  const history = await StatModel.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        isDeleted: { $ne: true },
        complete: true,
      },
    },
    {
      $project: {
        _id: 0,
        date: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: { $toDate: { $multiply: ['$ts', 1000] } },
          },
        },
      },
    },
    {
      $group: {
        _id: '$date',
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: -1 },
    },
    {
      $project: {
        // convert date to ISODate
        date: { $toDate: { $concat: ['$_id', 'T00:00:00Z'] } },
        sum: '$count',
      }
    }
  ]);

  return history;
}

export default withAuth({
  GET: {
    query: {
      type: ValidEnum(Object.values(ProStatsUserType)),
    }
  }
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (!isPro(req.user)) {
    return res.status(401).json({
      error: 'Not authorized',
    });
  }

  const { id: userId, type } = req.query as { id: string, type: string };

  // let's get the sum of this players playattempts sum(playattempt.endTime - playattempt.startTime) and divide by 1000
  let scoreHistory;

  if (type === ProStatsUserType.ScoreHistory) {
    scoreHistory = await getScoreHistory(userId);
  }

  return res.status(200).json({
    [ProStatsUserType.ScoreHistory]: scoreHistory,
  });
});
