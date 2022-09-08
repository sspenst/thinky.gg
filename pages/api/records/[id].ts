import type { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper from '../../../helpers/apiWrapper';
import { logger } from '../../../helpers/logger';
import cleanUser from '../../../lib/cleanUser';
import dbConnect from '../../../lib/dbConnect';
import Record from '../../../models/db/record';
import { RecordModel } from '../../../models/mongoose';

export default apiWrapper({ GET: {} }, async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;

  await dbConnect();

  try {
    const records = await RecordModel.find<Record>({ levelId: id }).populate('userId').sort({ moves: 1 });

    if (!records) {
      return res.status(404).json({
        error: 'Error finding Records',
      });
    }

    records.forEach(record => cleanUser(record.userId));

    return res.status(200).json(records);
  } catch (e){
    logger.error(e);

    return res.status(500).json({
      error: 'Error finding Records',
    });
  }
});
