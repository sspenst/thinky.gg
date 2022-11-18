import { NextApiResponse } from 'next';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { MultiplayerMatchModel } from '../../../models/mongoose';
import { MultiplayerMatchState, MultiplayerMatchType } from '../../../models/MultiplayerEnums';
import { LEVEL_DEFAULT_PROJECTION } from '../../../models/schemas/levelSchema';
import { enrichMultiplayerMatch, generateMatchLog } from '../../../models/schemas/multiplayerMatchSchema';
import { USER_DEFAULT_PROJECTION } from '../../../models/schemas/userSchema';

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

    const matches = await MultiplayerMatchModel.find(
      {
        $or: [
          { state: { $in: [MultiplayerMatchState.ACTIVE, MultiplayerMatchState.OPEN] } },
          {
            $and: [
              { players: { $in: [req.user._id] } },
              { state: MultiplayerMatchState.ACTIVE }
            ]
          }
        ]

      }, {}, { lean: true, populate: [
        { path: 'players', select: USER_DEFAULT_PROJECTION },
        { path: 'createdBy', select: USER_DEFAULT_PROJECTION },
        { path: 'winners', select: USER_DEFAULT_PROJECTION },
        { path: 'levels', select: LEVEL_DEFAULT_PROJECTION }],

      });

    for (const match of matches) {
      enrichMultiplayerMatch(match, req.user);
    }

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

    enrichMultiplayerMatch(match, req.user);

    return res.status(200).json(match);
  }
});
