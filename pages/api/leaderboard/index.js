import { UserModel } from '../../../models/mongoose';
import dbConnect from '../../../lib/dbConnect';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  await dbConnect();
  
  const users = await UserModel.find({}, 'name score').sort({ score: -1 });

  if (!users) {
    return res.status(500).json({
      error: 'Error finding Users',
    });
  }

  res.status(200).json(users);
}
