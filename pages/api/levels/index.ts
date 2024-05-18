import { getEnrichLevelsPipelineSteps, getEnrichUserIdPipelineSteps } from '@root/helpers/enrich';
import cleanUser from '@root/lib/cleanUser';
import { LEVEL_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import { EnrichedLevel } from '@root/models/db/level';
import { LevelModel } from '@root/models/mongoose';
import { PipelineStage, Types } from 'mongoose';
import { NextApiResponse } from 'next';
import { ValidObjectIdArray } from '../../../helpers/apiWrapper';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';

// GET api/notifications returns a mobile notification
export default withAuth({
  POST: { // Needs to be POST because of the length of the ids as well as parsing the ids
    body: {
      ids: ValidObjectIdArray(),
    }
  } }, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  const { ids } = req.body;

  if (ids.length > 25) {
    return res.status(400).json({
      error: 'Too many ids',
    });
  }

  const levels = await LevelModel.aggregate([
    {
      $match: {
        _id: {
          $in: ids.map((id: string) => new Types.ObjectId(id))
        },
        isDraft: {
          $ne: true
        },
        isDeleted: {
          $ne: true
        },
        gameId: req.gameId,
      },
    },

    { $project: { ...LEVEL_DEFAULT_PROJECTION, ...{ data: 1, width: 1, height: 1 } }, },
    ...getEnrichUserIdPipelineSteps('userId', 'userId'),
    ...getEnrichLevelsPipelineSteps(req.user) as PipelineStage[],
  ]);

  // now make sure levels is in the same order as ids
  const levelMap = new Map();

  levels.forEach((level) => {
    levelMap.set(level._id.toString(), level);
  });

  const sortedLevels: EnrichedLevel[] = [];

  ids.forEach((id: string) => {
    const level = levelMap.get(id);

    if (level) {
      cleanUser(level.userId);
      sortedLevels.push(level);
    }
  });

  return res.status(200).json(sortedLevels);
});
