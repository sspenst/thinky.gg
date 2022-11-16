import { NextApiResponse } from 'next';
import { ValidEnum } from '../../../helpers/apiWrapper';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { MultiplayerMatchModel } from '../../../models/mongoose';
import { generateMatchLog, MultiplayerMatchState } from '../../../models/schemas/multiplayerMatchSchema';

export default withAuth({ GET: {}, PUT: {
  body: {
    action: ValidEnum(['join', 'quit', 'submit']),
  }
} }, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  const { matchId } = req.query;

  if (req.method === 'GET') {
  // populate players, winners, and levels
    const match = await MultiplayerMatchModel.find({ matchId }, {}, { lean: true, populate: ['players', 'winners', 'levels'] });

    if (!match) {
      res.status(404).json({ error: 'Match not found' });

      return;
    }

    res.status(200).json(match);
  }
  else if (req.method === 'PUT') {
    const { action } = req.body;

    if (action === 'join') {
      // joining this match... Should also start the match!

      const log = generateMatchLog(req.user._id, 'joined');

      const updatedMatch = await MultiplayerMatchModel.findOneAndUpdate({
        matchId: matchId,
        state: 'open',
        players: { $nin: [req.user._id] },
      }, {
        $push: {
          startTime: Date.now() + 10000, // start 10 seconds into the future...
          players: req.user._id,
          matchLog: log,
          state: MultiplayerMatchState.STARTING,
        },
      }, { new: true, lean: true, populate: ['players', 'winners', 'levels', 'timeUntilStart'] });

      if (!updatedMatch) {
        res.status(400).json({ error: 'Match not found or you are already in the match' });

        return;
      }

      return res.status(200).json(updatedMatch);
    }
  }
});
