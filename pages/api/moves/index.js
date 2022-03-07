import UserModel from '../../../models/mongoose/userModel';
import dbConnect from '../../../lib/dbConnect';
import withAuth from '../../../lib/withAuth';

async function handler(req, res) {
  const { method } = req;

  if (method !== 'GET' && method !== 'PUT') {
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

  const userMoves = user.getMoves();

  if (method === 'GET') {
    return res.status(200).json(userMoves);
  }

  const { levelId, moves } = req.body;
  const bestMoves = userMoves[levelId];

  if (!bestMoves || moves < bestMoves) {
    userMoves[levelId] = moves;
    await UserModel.updateOne(
      { email: req.email },
      { moves: JSON.stringify(userMoves) }
    );
  }

  res.status(200).json({ success: true });
}

export default withAuth(handler);
