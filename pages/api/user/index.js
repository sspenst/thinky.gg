import UserModel from '../../../models/mongoose/userModel';
import dbConnect from '../../../lib/dbConnect';
import withAuth from '../../../lib/withAuth';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  await dbConnect();
  const user = await UserModel.findOne({ email: req.email });

  if (!user) {
    return res.status(404).json({
      error: 'User not found',
    });
  }

  res.status(200).json(user.clearPassword());
}

export default withAuth(handler);
