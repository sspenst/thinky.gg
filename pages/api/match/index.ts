import mongoose from 'mongoose';
import { NextApiResponse } from 'next';
import { requestBroadcastMatches } from '../../../lib/appSocketToClient';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import MultiplayerMatch from '../../../models/db/multiplayerMatch';
import User from '../../../models/db/user';
import { MultiplayerMatchModel, MultiplayerPlayerModel } from '../../../models/mongoose';
import {
  MatchAction,
  MultiplayerMatchState,
  MultiplayerMatchType,
} from '../../../models/MultiplayerEnums';
import { LEVEL_DEFAULT_PROJECTION } from '../../../models/schemas/levelSchema';
import {
  computeMatchScoreTable,
  enrichMultiplayerMatch,
  generateMatchLog,
} from '../../../models/schemas/multiplayerMatchSchema';
import { USER_DEFAULT_PROJECTION } from '../../../models/schemas/userSchema';

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

/**
 *
 * @param winnerElo
 * @param loserElo
 * @param gameResult 1 for win, 0 for loss, 0.5 for draw
 * @param kFactor
 * @returns
 */
function calculateEloChange(
  winnerElo: number,
  loserElo: number,
  gameResult: number,
  kFactor = 32,
) {
  const expectedScore = 1 / (1 + 10 ** ((loserElo - winnerElo) / 400));
  const eloChange = Math.round(kFactor * (gameResult - expectedScore));

  return eloChange;
}

export async function checkForFinishedMatch(matchId: string) {
  let finishedMatch = await MultiplayerMatchModel.findOneAndUpdate(
    {
      matchId: matchId,
      endTime: {
        $lte: new Date(),
      },
      state: { $ne: MultiplayerMatchState.FINISHED }
    },
    {
      $set: {
        state: MultiplayerMatchState.FINISHED,
        // todo: figure out how to set winner in this to save an extra query
      },
    },
    {
      new: true,
      lean: true,
    }
  ) as MultiplayerMatch | null;

  if (!finishedMatch) {
    return null;
  }

  const scoreTable = computeMatchScoreTable(finishedMatch);
  const sorted = Object.keys(scoreTable).sort((a, b) => {
    return scoreTable[b] - scoreTable[a];
  });
  const winnerId = sorted[0];
  const loserId = sorted[1];
  const winnerScore = scoreTable[winnerId];
  const loserScore = scoreTable[loserId];
  const tie = winnerScore === loserScore;
  // TODO: there is a miniscule chance that someone deletes their user account between the time the match ends and the time we update the winner and loser
  const userWinner = await MultiplayerPlayerModel.findOneAndUpdate(
    {
      userId: winnerId
    },
    {
    },
    {
      lean: true,
      upsert: true, // create the user if they don't exist
    }
  );
  const userLoser = await MultiplayerPlayerModel.findOneAndUpdate(
    {
      userId: loserId
    },
    {
    },
    {
      lean: true,
      upsert: true, // create the user if they don't exist
    }
  );

  // update elo...
  const eloChange = calculateEloChange(userWinner?.rating || 1500, userLoser?.rating || 1500, tie ? 0.5 : 1);

  await MultiplayerPlayerModel.findOneAndUpdate(
    {
      userId: winnerId,
    },
    {
      $inc: {
        rating: eloChange,
      },
    },
    {
      new: true,
    }
  );
  await MultiplayerPlayerModel.findOneAndUpdate(
    {
      userId: loserId,
    },
    {
      $inc: {
        rating: -eloChange,
      },
    },
    {
      new: true,
    }
  );
  const addWinners = !tie ? {
    $addToSet: {
      winners: new mongoose.Types.ObjectId(winnerId),
    }
  } : {};

  [finishedMatch, ] = await Promise.all([
    MultiplayerMatchModel.findOneAndUpdate(
      {
        matchId: matchId,
      },
      {
        ...addWinners,
        $push: {
          matchLog: generateMatchLog(MatchAction.GAME_RECAP, {
            eloChange: eloChange,
            winner: userWinner,
            loser: userLoser, // even though it may be a tie, calling it loser just for clarity...
          })
        }
      },
      {
        new: true,
        lean: true,
      }
    )
  ]);

  return finishedMatch;
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
        userId: reqUser._id,
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
 * Gets open and active matches by default
 * @param reqUser
 * @param matchFilters
 * @returns
 */
export async function getAllMatches(reqUser?: User, matchFilters: any = null) {
  if (!matchFilters) {
    matchFilters = {
      private: false,
      state: {
        $in: [MultiplayerMatchState.ACTIVE, MultiplayerMatchState.OPEN],
      }
    };
  }

  const [matches] = await Promise.all([
    MultiplayerMatchModel.aggregate([
      {
        $match: matchFilters,
      },
      {
        $lookup: {
          from: 'users',
          localField: 'players',
          foreignField: '_id',
          as: 'players',
          // select on the fields we need
          pipeline: [
            {
              $project: USER_DEFAULT_PROJECTION
              ,
            },
            {
              $lookup: {
                from: 'multiplayerplayers',
                localField: '_id',
                foreignField: 'userId',
                as: 'multiplayerProfile',
                pipeline: [{
                  $project: { rating: 1, ratingDeviation: 1, volatility: 1 }
                }]
              }
            },
            {
              $unwind: {
                path: '$multiplayerProfile',
                preserveNullAndEmptyArrays: true,
              }
            }

          ],
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'winners',
          foreignField: '_id',
          as: 'winners',
          pipeline: [
            {
              $project: USER_DEFAULT_PROJECTION
              ,
            },
          ],
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'createdBy',
          pipeline: [
            {
              $project: USER_DEFAULT_PROJECTION
              ,
            },
          ],
        }
      },
      {
        $unwind: '$createdBy',
      },
      {
        $lookup: {
          from: 'levels',
          localField: 'levels',
          foreignField: '_id',
          as: 'levels',
          pipeline: [
            {
              $project: LEVEL_DEFAULT_PROJECTION
              ,
            },
          ],
        }
      },
      /*{
        $set: {
          winners: USER_DEFAULT_PROJECTION,
          players: USER_DEFAULT_PROJECTION,
          createdBy: USER_DEFAULT_PROJECTION,
          levels: LEVEL_DEFAULT_PROJECTION,
        }
      }*/

    ]),
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

      requestBroadcastMatches();

      return res.status(200).json(match);
    }
  }
);
