import { NextApiResponse } from 'next';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import User from '../../../models/db/user';
import { MultiplayerMatchModel } from '../../../models/mongoose';
import {
  MatchAction,
  MultiplayerMatchState,
  MultiplayerMatchType,
} from '../../../models/MultiplayerEnums';
import { LEVEL_DEFAULT_PROJECTION } from '../../../models/schemas/levelSchema';
import {
  enrichMultiplayerMatch,
  generateMatchLog,
} from '../../../models/schemas/multiplayerMatchSchema';
import { USER_DEFAULT_PROJECTION } from '../../../models/schemas/userSchema';
import { requestBroadcastMatches } from '../../appSocketToClient';

function makeId(length: number) {
  let result = '';
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
}

export async function checkForFinishedMatches() {
  await MultiplayerMatchModel.updateMany(
    {
      state: MultiplayerMatchState.ACTIVE,
      endTime: {
        $lte: new Date(),
      },
    },
    {
      $set: {
        state: MultiplayerMatchState.FINISHED,
      },
    }
  );
}

export async function checkForFinishedMatch(matchId: string) {
  return await MultiplayerMatchModel.findOneAndUpdate(
    {
      matchId: matchId,
      endTime: {
        $lte: new Date(),
      },
    },
    {
      $set: {
        state: MultiplayerMatchState.FINISHED,
      },
    },
    {
      new: true,
      lean: true,
    }
  );
}

export async function createMatch(reqUser: User) {
  const involvedMatch = await MultiplayerMatchModel.findOne(
    {
      players: reqUser._id,
      state: {
        $in: [MultiplayerMatchState.ACTIVE, MultiplayerMatchState.OPEN],
      },
    },
    {},
    { lean: true }
  );

  if (involvedMatch) {
    return null;
  }

  // if not, create a new match
  // generate 11 character id
  const matchId = makeId(11);
  const match = await MultiplayerMatchModel.create({
    createdBy: reqUser._id,
    matchId: matchId,
    matchLog: [
      generateMatchLog(MatchAction.CREATE, {
        userId: reqUser,
      }),
    ],
    players: [reqUser._id],
    private: false,
    state: MultiplayerMatchState.OPEN,
    type: MultiplayerMatchType.ClassicRush,
  });

  enrichMultiplayerMatch(match, reqUser._id.toString());

  return match;
}

/**
 * Gets open and active matches
 * @param reqUser
 * @returns
 */
export async function getAllMatches(reqUser?: User) {
  const [matches] = await Promise.all([
    MultiplayerMatchModel.find(
      {
        private: false,
        state: {
          $in: [MultiplayerMatchState.ACTIVE, MultiplayerMatchState.OPEN],
        },
      },
      {},
      {
        lean: true,
        populate: [
          { path: 'players', select: USER_DEFAULT_PROJECTION },
          { path: 'createdBy', select: USER_DEFAULT_PROJECTION },
          { path: 'winners', select: USER_DEFAULT_PROJECTION },
          { path: 'levels', select: LEVEL_DEFAULT_PROJECTION },
        ],
      }
    ),
    checkForFinishedMatches(),
  ]);

  if (reqUser) {
    for (const match of matches) {
      enrichMultiplayerMatch(match, reqUser._id.toString());
    }
  }

  return matches;
}

export default withAuth(
  {
    GET: {
      query: {},
    },
    POST: {},
  },
  async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
    if (req.method === 'GET') {
      // get any matches
      const matches = await getAllMatches(req.user);

      return res.status(200).json(matches);
    } else if (req.method === 'POST') {
      // first check if user already is involved in a match
      const match = await createMatch(req.user);

      if (!match) {
        return res
          .status(400)
          .json({ error: 'You are already involved in a match' });
      }

      await requestBroadcastMatches();

      return res.status(200).json(match);
    }
  }
);
