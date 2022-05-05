import type { NextApiRequest, NextApiResponse } from 'next';
import Record from '../../../models/db/record';
import { RecordModel } from '../../../models/mongoose';
import User from '../../../models/db/user';
import dbConnect from '../../../lib/dbConnect';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  const { id } = req.query;

  await dbConnect();
  
  const records = await RecordModel.find<Record>({ levelId: id })
    .populate<{userId: User}>('userId', 'name').sort({ moves: -1 });

  if (!records) {
    return res.status(500).json({
      error: 'Error finding Records',
    });
  }

  res.status(200).json(records);
}
