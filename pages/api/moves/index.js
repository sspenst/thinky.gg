// import LevelModel from '../../../models/mongoose/levelModel';
import UserModel from '../../../models/mongoose/userModel';
import dbConnect from '../../../lib/dbConnect';
import withAuth from '../../../lib/withAuth';

async function handler(req, res) {
  const { method } = req;

  if (method === 'GET') {
    await dbConnect();
    const user = await UserModel.findOne({ email: req.email });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    return res.status(200).json(user.getMoves());
  } else if (method === 'PUT') {
    await dbConnect();
    const { levelId, moves } = req.body;

    // TODO: could use the level to verify if a submitted solution is correct

    // const [level, user] = await Promise.all([
    //   LevelModel.findById(levelId),
    //   UserModel.findOne({ email: req.email }),
    // ]);
    
    // if (!level) {
    //   return res.status(404).json({
    //     error: 'Level not found',
    //   });
    // }

    const user = await UserModel.findOne({ email: req.email });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    const userMoves = user.getMoves();
    const bestMoves = userMoves[levelId];
  
    if (!bestMoves || moves < bestMoves) {
      userMoves[levelId] = moves;
      await UserModel.updateOne(
        { email: req.email },
        { moves: JSON.stringify(userMoves) }
      );
    }
  
    res.status(200).json({ success: true });
  } else {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }
}

export default withAuth(handler);
