import { UserAndStatTs } from '@root/contexts/levelContext';
import { ValidNumber, ValidObjectId } from '@root/helpers/apiWrapper';
import mongoose from 'mongoose';
import { NextApiResponse } from 'next';
import isPro from '../../../../../helpers/isPro';
import cleanUser from '../../../../../lib/cleanUser';
import withAuth, { NextApiRequestWithAuth } from '../../../../../lib/withAuth';
import { StatModel } from '../../../../../models/mongoose';
import { USER_DEFAULT_PROJECTION } from '../../../../../models/schemas/userSchema';

async function getSolvesBySteps(levelId: string, skip: number, steps: number) {
  const agg = await StatModel.aggregate([
    {
      $match: {
        levelId: new mongoose.Types.ObjectId(levelId as string),
        moves: steps,
      },
    },
    {
      $sort: {
        ts: -1,
      }
    },
    {
      $skip: skip,
    },
    {
      $limit: 50,
    },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
        pipeline: [
          {
            $project: {
              ...USER_DEFAULT_PROJECTION
            }
          },
        ]
      },
    },
    {
      $unwind: {
        path: '$user',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        statTs: '$ts',
      }
    },
    {
      $project: {
        statTs: 1,
        user: 1,
      }
    }
  ]) as UserAndStatTs[];

  agg.forEach(userAndStatTs => cleanUser(userAndStatTs.user));

  return agg;
}

export default withAuth({
  GET: {
    query: {
      id: ValidObjectId(true),
      skip: ValidNumber(true, 0),
      steps: ValidNumber(true, 1),
    },
  },
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  const pro = isPro(req.user);

  if (!pro) {
    return res.status(401).json({
      error: 'Error: Requires Pathology Pro',
    });
  }

  const { id, skip, steps } = req.query;
  const solves = await getSolvesBySteps(id as string, Number(skip), Number(steps));

  return res.status(200).json(solves);
});
