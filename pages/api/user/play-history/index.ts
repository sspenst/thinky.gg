import isPro from '@root/helpers/isPro';
import withAuth from '@root/lib/withAuth';
import { PlayAttemptModel } from '@root/models/mongoose';
import { LEVEL_DEFAULT_PROJECTION } from '@root/models/schemas/levelSchema';
import { Types } from 'mongoose';

async function GetPlayAttempts(userId: Types.ObjectId) {
  // sort by end time
  return PlayAttemptModel.aggregate([
    {
      $match: {
        userId,
      },
    },
    {
      $sort: {
        endTime: -1,
      },
    },
    {
      $limit: 10,
    },
    {
      $lookup: {
        from: 'levels',
        localField: 'levelId',
        foreignField: '_id',
        as: 'levelId',
        pipeline: [
          {
            $project: LEVEL_DEFAULT_PROJECTION,

          }
        ]
      },
    },
    {
      $unwind: {
        path: '$levelId',
      },
    },
  ]);
}

export default withAuth({
  GET: {}
}, async (req, res) => {
  if (isPro(req.user) === false) {
    return res.status(403).json({
      error: 'You must be a pro user to access this endpoint.',
    });
  }

  const playAttempts = await GetPlayAttempts(req.user._id);

  return res.status(200).json(playAttempts);
});
