import type { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper, { ValidObjectId } from '../../../helpers/apiWrapper';
import { logger } from '../../../helpers/logger';
import cleanUser from '../../../lib/cleanUser';
import dbConnect from '../../../lib/dbConnect';
import Record from '../../../models/db/record';
import { StatModel } from '../../../models/mongoose';

export default apiWrapper({ GET: {
  query: {
    id: ValidObjectId(),
  },
} }, async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;

  await dbConnect();

  try {
    const completions = await StatModel.find<Record>({ levelId: id, complete: true }).populate('userId').sort({ ts: 1 }).limit(10);

    completions.forEach(completion => cleanUser(completion.userId));

    return res.status(200).json(completions);
  } catch (e){
    logger.error(e);

    return res.status(500).json({
      error: 'Error finding completions',
    });
  }
});
