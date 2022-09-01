import type { NextApiResponse } from 'next';
import { logger } from '../../../helpers/logger';
import dbConnect from '../../../lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import { LevelModel } from '../../../models/mongoose';

export default withAuth({ methods: ['GET'] }, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  await dbConnect();

  try {
    const levels = await LevelModel.find<Level>({
      userId: req.userId,
    }).sort({ name: 1 });

    if (!levels) {
      return res.status(500).json({
        error: 'Error finding Levels',
      });
    }

    return res.status(200).json(levels);
  }
  catch (e){
    logger.error(e);

    return res.status(500).json({
      error: 'Error finding Levels',
    });
  }
});
