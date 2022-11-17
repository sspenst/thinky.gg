import { NextApiResponse } from 'next';
import { ValidEnum } from '../../../helpers/apiWrapper';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { MultiplayerMatchModel } from '../../../models/mongoose';
import { generateMatchLog, MultiplayerMatchState, MultiplayerMatchType } from '../../../models/schemas/multiplayerMatchSchema';

function makeId(length: number) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;

  for ( let i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
}

export default withAuth({ GET: {
  query: {

  }
}, POST: {} }, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'GET') {
    // get any matches

    const matches = await MultiplayerMatchModel.find({ players: req.user._id, state: { $in: [MultiplayerMatchState.ACTIVE, MultiplayerMatchState.OPEN] }
    }, {}, { lean: true, populate: ['players', 'winners', 'levels', 'createdBy'] });

    return res.status(200).json(matches);
  }

  else if (req.method === 'POST') {
    // first check if user already is involved in a match

    const involvedMatch = await MultiplayerMatchModel.findOne({ players: req.user._id, state: { $in: [MultiplayerMatchState.ACTIVE, MultiplayerMatchState.OPEN] } }, {}, { lean: true });

    if (involvedMatch) {
      return res.status(400).json({ error: 'You are already involved in a match' });
    }

    // if not, create a new match
    // generate 11 character id
    const matchId = makeId(11);
    const match = await MultiplayerMatchModel.create({
      createdBy: req.user._id,
      matchId: matchId,
      matchLog: [generateMatchLog(req.user._id, 'created')],
      players: [req.user._id],
      private: false,
      state: MultiplayerMatchState.OPEN,
      type: MultiplayerMatchType.ClassicRush,

    });

    return res.status(200).json(match);
  }
});
