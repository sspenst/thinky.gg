import UserModel from '../../../models/mongoose/userModel';
import dbConnect from '../../../lib/dbConnect';
import withAuth from '../../../lib/withAuth';

async function handler(req, res) {
  if (req.method !== 'PUT') {
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

  const { complete, levelId, moves } = req.body;

  if (!user.stats) {
    user.stats = {};
  }

  let levelStats = user.stats[levelId];
  let needsUpdate = true;

  if (!levelStats) {
    user.stats[levelId] = { complete: complete, moves: moves };

    if (complete) {
      user.score += 1;
    }
  } else if (moves < levelStats.moves) {
    levelStats.complete = complete;
    levelStats.moves = moves;

    if (complete) {
      user.score += 1;
    }
  } else {
    needsUpdate = false;
  }

  if (needsUpdate) {
    await UserModel.updateOne(
      { email: req.email },
      { score: user.score, stats: user.stats }
    );

    // const uri = process.env.LOCAL ? 'http://localhost:3000' : 'https://pathology.sspenst.com';

    // revalidate the leaderboard in the background, however this is not guaranteed to complete
    // if the leaderboard isn't updated here, the client will still get the latest data with SWR
    // fetch(`${uri}/api/revalidate?secret=${process.env.REVALIDATE_SECRET}`);
  }

  res.status(200).json({ updated: needsUpdate });
}

export default withAuth(handler);
