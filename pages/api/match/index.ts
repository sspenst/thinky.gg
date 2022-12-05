import mongoose, { PipelineStage } from 'mongoose';
import { NextApiResponse } from 'next';
import { getEnrichLevelsPipelineSteps } from '../../../helpers/enrich';
import { logger } from '../../../helpers/logger';
import { isProvisional } from '../../../helpers/multiplayerHelperFunctions';
import { requestBroadcastMatches } from '../../../lib/appSocketToClient';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import MultiplayerMatch from '../../../models/db/multiplayerMatch';
import User from '../../../models/db/user';
import { MultiplayerMatchModel, MultiplayerProfileModel } from '../../../models/mongoose';
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
  const matches = await MultiplayerMatchModel.find(
    {
      state: MultiplayerMatchState.ACTIVE,
      endTime: {
        $lte: new Date(),
      },
    },
    {},
    {
      lean: true,
    }
  );

  for (const match of matches) {
    await finishMatch(match);
  }
}

/**
 *
 * @param winnerElo
 * @param loserElo
 * @param gameResult 1 for win, 0 for loss, 0.5 for draw
 * @param kFactor
 * @returns
 */
export function calculateEloChange(
  winnerElo: number,
  loserElo: number,
  winnerProvisional: boolean,
  loserProvisional: boolean,
  gameResult: number,
  kFactorMultiplier = 1 // number of games
) {
  let eloWinnerKFactor = 20 * kFactorMultiplier;
  let eloLoserKFactor = 20 * kFactorMultiplier;
  let eloWinnerMultiplier = 1;
  let eloLoserMultiplier = 1;
  const expectedScore = 1 / (1 + 10 ** ((loserElo - winnerElo) / 400));

  if (winnerProvisional) {
    eloLoserMultiplier = 0.5;
    eloWinnerKFactor = 40 * kFactorMultiplier;
  }

  if (loserProvisional) {
    eloWinnerMultiplier = 0.5;
    eloLoserKFactor = 40 * kFactorMultiplier;
  }

  let eloChangeWinner = (eloWinnerKFactor * (gameResult - expectedScore));
  let eloChangeLoser = (eloLoserKFactor * (gameResult - expectedScore));

  if (gameResult > 0.5) {
    eloChangeWinner = Math.max(eloChangeWinner, 0);
  }

  if (gameResult < 0.5) {
    eloChangeLoser = Math.min(eloChangeLoser, 0);
  }

  return [(eloChangeWinner * eloWinnerMultiplier), -(eloChangeLoser * eloLoserMultiplier)];
}

export async function finishMatch(finishedMatch: MultiplayerMatch, quitUserId?: string) {
  const scoreTable = computeMatchScoreTable(finishedMatch);
  const sorted = Object.keys(scoreTable).sort((a, b) => {
    return scoreTable[b] - scoreTable[a];
  });
  let winnerId = sorted[0];
  let loserId = sorted[1];

  if (winnerId === quitUserId) {
    winnerId = loserId;
    loserId = quitUserId;
  }

  const winnerScore = scoreTable[winnerId];
  const loserScore = scoreTable[loserId];
  const tie = winnerScore === loserScore && !quitUserId;
  // TODO: there is a miniscule chance that someone deletes their user account between the time the match ends and the time we update the winner and loser

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const userWinner = await MultiplayerProfileModel.findOneAndUpdate(
        {
          userId: winnerId
        },
        {
        },
        {
          lean: true,
          upsert: true, // create the user if they don't exist
          new: true,
          session: session,
        }
      );
      const userLoser = await MultiplayerProfileModel.findOneAndUpdate(
        {
          userId: loserId
        },
        {
        },
        {
          lean: true,
          upsert: true, // create the user if they don't exist
          new: true,
          session: session,
        }
      );

      // update elo...

      const winnerProvisional = isProvisional(userWinner);
      const loserProvisional = isProvisional(userLoser);
      const sum = winnerScore + loserScore;
      let result = 0.5;

      if (sum > 0) {
        result = winnerScore / sum;
      }

      /*
      if winnerScore is 9 and loserScore is 1 then result should be 0.9
      if winnerScore is 1 and loserScore is 9 then result should be 0.1
      if winnerScore is 5 and loserScore is 5 then result should be 0.5
      */
      const [eloChangeWinner, eloChangeLoser] = calculateEloChange(userWinner?.rating || 1000, userLoser?.rating || 1000, winnerProvisional, loserProvisional, result, sum);

      await MultiplayerProfileModel.findOneAndUpdate(
        {
          userId: winnerId,
        },
        {
          $inc: {
            rating: eloChangeWinner,
            calc_matches_count: 1,
          },
        },
        {
          new: true,
          session: session,
        }
      );
      await MultiplayerProfileModel.findOneAndUpdate(
        {
          userId: loserId,
        },
        {
          $inc: {
            rating: eloChangeLoser,
            calc_matches_count: 1,
          },
        },
        {
          new: true,
          session: session,
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
            matchId: finishedMatch.matchId,
          },
          {
            ...addWinners,
            state: MultiplayerMatchState.FINISHED,
            endTime: Date.now(),
            $push: {
              matchLog: generateMatchLog(MatchAction.GAME_RECAP, {
                eloChangeWinner: eloChangeWinner,
                eloChangeLoser: eloChangeLoser,
                winnerProvisional: winnerProvisional,
                loserProvisional: loserProvisional,
                winner: userWinner,
                loser: userLoser, // even though it may be a tie, calling it loser just for clarity...
              })
            }
          },
          {
            new: true,
            lean: true,
            session: session,
          }
        )
      ]);
    });
  } catch (e) {
    logger.error(e);
    session.endSession();
  }

  return finishedMatch;
}

export async function checkForFinishedMatch(matchId: string) {
  const finishedMatch = await MultiplayerMatchModel.findOneAndUpdate(
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

  return await finishMatch(finishedMatch);
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

  const lookupPipelineUser: PipelineStage[] = getEnrichLevelsPipelineSteps(reqUser, '_id', '');

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
              $project: USER_DEFAULT_PROJECTION,
            },
            {
              $lookup: {
                from: 'multiplayerprofiles',
                localField: '_id',
                foreignField: 'userId',
                as: 'multiplayerProfile',
                pipeline: [{
                  $project: { rating: 1, ratingDeviation: 1, volatility: 1, calc_matches_count: 1, _id: 0 }
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
              $project: USER_DEFAULT_PROJECTION,
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
              $project: USER_DEFAULT_PROJECTION,
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
          as: 'levelsPopulated',
          pipeline: [
            {
              $project: {
                ...LEVEL_DEFAULT_PROJECTION,
                calc_playattempts_unique_users: 1
              }
              // for each level we need to populate userId
            },
            ...lookupPipelineUser as PipelineStage.Lookup[],
            {
              $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'userId',
                pipeline: [
                  {
                    $project: USER_DEFAULT_PROJECTION,
                  }
                ]
              }
            },
            {
              $unwind: {
                path: '$userId',
                preserveNullAndEmptyArrays: true,
              }
            }
          ],
        }
      },

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
