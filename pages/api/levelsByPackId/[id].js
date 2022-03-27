import { LevelModel } from '../../../models/mongoose';
import dbConnect from '../../../lib/dbConnect';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  const { id } = req.query;

  await dbConnect();
  
  const levels = await LevelModel.find({ packId: id }, '_id author leastMoves name');

  if (!levels) {
    return res.status(500).json({
      error: 'Error finding Levels',
    });
  }

  levels.sort((a, b) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);

  res.status(200).json(levels);
}
