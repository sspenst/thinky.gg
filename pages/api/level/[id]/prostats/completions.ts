import { UserAndStatTs } from '@root/contexts/levelContext';
import { ValidNumber, ValidObjectId } from '@root/helpers/apiWrapper';
import { getEnrichUserConfigPipelineStage } from '@root/helpers/enrich';
import { USER_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import mongoose from 'mongoose';
import { NextApiResponse } from 'next';
import { hasProAccessForLevel } from '../../../../../helpers/isDemoProAccess';
import isPro from '../../../../../helpers/isPro';
import cleanUser from '../../../../../lib/cleanUser';
import withAuth, { NextApiRequestWithAuth } from '../../../../../lib/withAuth';
import { LevelModel, StatModel, UserModel } from '../../../../../models/mongoose';

async function getCompletionsBySteps(isPro: boolean, levelId: string, skip: number, steps: number) {
  const agg = await StatModel.aggregate([
    {
      $match: {
        levelId: new mongoose.Types.ObjectId(levelId as string),
        moves: steps,
        // if not pro, can only search optimal solves
        ...(isPro ? {} : { complete: true }),
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
        from: UserModel.collection.name,
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
    ...getEnrichUserConfigPipelineStage('$gameId', { excludeCalcs: true, localField: 'user._id', lookupAs: 'user.config' }),
    {
      $project: {
        statTs: 1,
        user: 1,
      }
    },
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
  const { id, skip, steps } = req.query;
  const level = await LevelModel.findById(id as string, { userId: 1, slug: 1 }).populate('userId', 'name');

  if (!level) {
    return res.status(404).json({
      error: 'Level not found',
    });
  }

  const hasAccess = hasProAccessForLevel(req.user, level);
  const solves = await getCompletionsBySteps(hasAccess, id as string, Number(skip), Number(steps));

  return res.status(200).json(solves);
});
