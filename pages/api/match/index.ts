import Discord from '@root/constants/discord';
import queueDiscordWebhook from '@root/helpers/discordWebhook';
import mongoose, { PipelineStage, Types } from 'mongoose';
import { NextApiResponse } from 'next';
import { getRatingFromProfile } from '../../../components/matchStatus';
import { ValidEnum, ValidType } from '../../../helpers/apiWrapper';
import { getEnrichLevelsPipelineSteps } from '../../../helpers/enrich';
import { logger } from '../../../helpers/logger';
import { isProvisional } from '../../../helpers/multiplayerHelperFunctions';
import { requestBroadcastMatches, requestClearBroadcastMatchSchedule } from '../../../lib/appSocketToClient';
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
import { abortMatch } from './[matchId]';

function makeId(length: number) {
  let result = '';
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;

  for (let i = 0; i < length; i++) {
    result = result + characters.charAt(Math.floor(Math.random() * charactersLength));
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
) {
  let eloWinnerKFactor = 20;
  let eloLoserKFactor = 20;
  let eloWinnerMultiplier = 1;
  let eloLoserMultiplier = 1;
  const expectedScore = 1 / (1 + 10 ** ((loserElo - winnerElo) / 400));

  if (winnerProvisional) {
    eloLoserMultiplier = 0.5;
    eloWinnerKFactor = 40;
  }

  if (loserProvisional) {
    eloWinnerMultiplier = 0.5;
    eloLoserKFactor = 40;
  }

  const eloChangeWinner = (eloWinnerKFactor * (gameResult - expectedScore));
  const eloChangeLoser = (eloLoserKFactor * (gameResult - expectedScore));

  return [(eloChangeWinner * eloWinnerMultiplier), -(eloChangeLoser * eloLoserMultiplier)];
}

export async function finishMatch(finishedMatch: MultiplayerMatch, quitUserId?: string) {
  await requestClearBroadcastMatchSchedule(finishedMatch.matchId);
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
      const [userWinner, userLoser] = await Promise.all([MultiplayerProfileModel.findOneAndUpdate(
        {
          userId: winnerId,
        },
        {
        },
        {
          lean: true,
          upsert: true, // create the user if they don't exist
          new: true,
          session: session,
        }
      ),
      await MultiplayerProfileModel.findOneAndUpdate(
        {
          userId: loserId,
        },
        {
        },
        {
          lean: true,
          upsert: true, // create the user if they don't exist
          new: true,
          session: session,
        }
      )]);

      // update elo...

      const winnerProvisional = isProvisional(userWinner);
      const loserProvisional = isProvisional(userLoser);

      let [eloChangeWinner, eloChangeLoser] = calculateEloChange(getRatingFromProfile(userWinner, finishedMatch.type) || 1000, getRatingFromProfile(userLoser, finishedMatch.type) || 1000, winnerProvisional, loserProvisional, tie ? 0.5 : 1);

      if (finishedMatch.rated) {
        const ratingField = 'rating' + finishedMatch.type;
        const countMatchField = 'calc' + finishedMatch.type + 'Count';

        await Promise.all([MultiplayerProfileModel.findOneAndUpdate(
          {
            userId: new Types.ObjectId(winnerId),
          },
          {
            $inc: {
              [ratingField]: eloChangeWinner,
              [countMatchField]: 1,
            },
          },
          {
            new: true,
            session: session,
          }
        ),
        MultiplayerProfileModel.findOneAndUpdate(
          {
            userId: new Types.ObjectId(loserId),
          },
          {
            $inc: {
              [ratingField]: eloChangeLoser,
              [countMatchField]: 1,
            },
          },
          {
            new: true,
            session: session,
          }
        )]);
      } else {
        eloChangeWinner = 0;
        eloChangeLoser = 0;
      }

      const addWinners = !tie ? {
        $addToSet: {
          winners: new mongoose.Types.ObjectId(winnerId),
        }
      } : {};

      [finishedMatch, ] = await Promise.all([
        MultiplayerMatchModel.findOneAndUpdate(
          {
            matchId: finishedMatch.matchId,
            state: MultiplayerMatchState.ACTIVE,
          },
          {
            ...addWinners,
            state: MultiplayerMatchState.FINISHED,
            endTime: Date.now(),
            $push: {
              matchLog: generateMatchLog(MatchAction.GAME_RECAP, {
                eloWinner: getRatingFromProfile(userWinner, finishedMatch.type) || 1000,
                eloLoser: getRatingFromProfile(userLoser, finishedMatch.type) || 1000,
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

      if (!finishedMatch) {
        throw new Error('Failed to finish match');
      }
    });
  } catch (e) {
    logger.error(e);
    session.endSession();
  }

  return finishedMatch;
}

export async function checkForUnreadyAboutToStartMatch(matchId: string) {
  const finishedMatch = await MultiplayerMatchModel.findOne(
    {
      matchId: matchId,
      state: MultiplayerMatchState.ACTIVE,
      // check where every id in markedReady is in players
      startTime: {
        $lte: new Date(),
      }
    },
    'createdBy players markedReady',
    { lean: true }
  ) as MultiplayerMatch | null;

  if (!finishedMatch) {
    return null;
  }

  if (finishedMatch.markedReady.length !== finishedMatch.players.length) {
    return await abortMatch(matchId, finishedMatch.createdBy._id);
  } else {
    return null;
  }
}

export function multiplayerMatchTypeToText(option: MultiplayerMatchType) {
  switch (option) {
  case MultiplayerMatchType.RushBullet:
    return 'Bullet (3m)';
  case MultiplayerMatchType.RushBlitz:
    return 'Blitz (5m)';
  case MultiplayerMatchType.RushRapid:
    return 'Rapid (10m)';
  case MultiplayerMatchType.RushClassical:
    return 'Classical (30m)';
  }
}

export async function checkForFinishedMatch(matchId: string) {
  const finishedMatch = await MultiplayerMatchModel.findOne(
    {
      matchId: matchId,
      endTime: {
        $lte: new Date(),
      },
      state: MultiplayerMatchState.ACTIVE,
    },
    {},
    { lean: true }
  ) as MultiplayerMatch | null;

  if (!finishedMatch) {
    return null;
  }

  return await finishMatch(finishedMatch);
}

export async function createMatch(reqUser: User, options: { type: MultiplayerMatchType, private: boolean, rated: boolean }) {
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

  const joinUrl = 'https://pathology.gg/match/' + matchId;
  const discordMessage = `New ${multiplayerMatchTypeToText(options.type)} match created by **${reqUser.name}**! [Join!]<${joinUrl}>`;

  const [match] = await Promise.all([MultiplayerMatchModel.create({
    createdBy: reqUser._id,
    matchId: matchId,
    matchLog: [
      generateMatchLog(MatchAction.CREATE, {
        userId: reqUser._id,
      }),
    ],
    players: [reqUser._id],
    private: options.private,
    rated: options.rated,
    state: MultiplayerMatchState.OPEN,
    type: options.type,
  }),
  queueDiscordWebhook(Discord.Multiplayer, discordMessage)
  ]);

  enrichMultiplayerMatch(match, reqUser._id.toString());

  return match;
}

/**
 * Gets open and active matches by default
 * @param reqUser
 * @param matchFilters
 * @returns
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    MultiplayerMatchModel.aggregate<MultiplayerMatch>([
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
    POST: {
      body: {
        type: ValidEnum(Object.values(MultiplayerMatchType)),
        private: ValidType('boolean'),
        rated: ValidType('boolean'),
      }
    },
  },
  async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
    if (req.method === 'GET') {
      // get any matches
      const matches = await getAllMatches(req.user);

      return res.status(200).json(matches);
    } else if (req.method === 'POST') {
      // first check if user already is involved in a match
      let match;

      try {
        match = await createMatch(req.user, { type: req.body.type, private: req.body.private, rated: req.body.rated });
      } catch (e) {
        logger.error(e);

        return res.status(500).json({ error: 'Something went wrong' });
      }

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
