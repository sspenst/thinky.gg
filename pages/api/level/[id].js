import LevelModel from '../../../models/mongoose/levelModel';
import dbConnect from '../../../lib/dbConnect';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  const { id } = req.query;

  await dbConnect();
  
  const level = await LevelModel.findById(id);

  if (!level) {
    return res.status(500).json({
      error: 'Error finding Level',
    });
  }

  res.status(200).json(level);
}
