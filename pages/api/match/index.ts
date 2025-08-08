import AchievementCategory from '@root/constants/achievements/achievementCategory';
import DiscordChannel from '@root/constants/discordChannel';
import { GameId } from '@root/constants/GameId';
import queueDiscordWebhook from '@root/helpers/discordWebhook';
import { SlugUtil } from '@root/helpers/generateSlug';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import { abortMatch } from '@root/helpers/match/abortMatch';
import { LEVEL_DEFAULT_PROJECTION, USER_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import MultiplayerProfile from '@root/models/db/multiplayerProfile';
import { MULTIPLAYER_INITIAL_ELO } from '@root/models/schemas/multiplayerProfileSchema';
import mongoose, { PipelineStage, Types } from 'mongoose';
import { NextApiResponse } from 'next';
import { ValidEnum, ValidType } from '../../../helpers/apiWrapper';
import { getEnrichLevelsPipelineSteps, getEnrichUserConfigPipelineStage } from '../../../helpers/enrich';
import { logger } from '../../../helpers/logger';
import { getRatingFromProfile, isProvisional, multiplayerMatchTypeToText } from '../../../helpers/multiplayerHelperFunctions';
import { requestBroadcastMatches, requestClearBroadcastMatchSchedule } from '../../../lib/appSocketToClient';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { MatchAction, MultiplayerMatchState, MultiplayerMatchType } from '../../../models/constants/multiplayer';
import MultiplayerMatch from '../../../models/db/multiplayerMatch';
import User from '../../../models/db/user';
import { LevelModel, MultiplayerMatchModel, MultiplayerProfileModel, UserModel } from '../../../models/mongoose';
import { computeMatchScoreTable, createMatchEventMessage, createSystemChatMessage, createUserActionMessage, enrichMultiplayerMatch, generateMatchLog } from '../../../models/schemas/multiplayerMatchSchema';
import { queueRefreshAchievements } from '../internal-jobs/worker/queueFunctions';

export async function checkForFinishedMatches() {
  const matches = await MultiplayerMatchModel.find(
    {
      state: MultiplayerMatchState.ACTIVE,
      endTime: {
        $lte: new Date(),
      },
    },
  ).lean<MultiplayerMatch[]>();

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
  let newFinishedMatch: MultiplayerMatch | null = null;

  try {
    await session.withTransaction(async () => {
      const [userWinner, userLoser] = await Promise.all([
        MultiplayerProfileModel.findOneAndUpdate(
          {
            userId: winnerId,
            gameId: finishedMatch.gameId,
          },
          {
            gameId: finishedMatch.gameId,
            userId: winnerId,
          },
          {
            upsert: true, // create the user if they don't exist
            new: true,
            session: session,
          }
        ).lean<MultiplayerProfile>(),
        MultiplayerProfileModel.findOneAndUpdate(
          {
            userId: loserId,
            gameId: finishedMatch.gameId,
          },
          {
            gameId: finishedMatch.gameId,
            userId: loserId,
          },
          {
            upsert: true, // create the user if they don't exist
            new: true,
            session: session,
          }
        ).lean<MultiplayerProfile>(),
      ]);

      if (!userWinner) {
        throw new Error(`userWinner ${winnerId} not found`);
      }

      if (!userLoser) {
        throw new Error(`userLoser ${loserId} not found`);
      }

      // update elo...

      const winnerProvisional = isProvisional(finishedMatch.type, userWinner);
      const loserProvisional = isProvisional(finishedMatch.type, userLoser);

      let [eloChangeWinner, eloChangeLoser] = calculateEloChange(
        getRatingFromProfile(userWinner, finishedMatch.type) || MULTIPLAYER_INITIAL_ELO,
        getRatingFromProfile(userLoser, finishedMatch.type) || MULTIPLAYER_INITIAL_ELO,
        winnerProvisional,
        loserProvisional,
        tie ? 0.5 : 1,
      );

      if (finishedMatch.rated) {
        const ratingField = 'rating' + finishedMatch.type;
        const countMatchField = 'calc' + finishedMatch.type + 'Count';

        await Promise.all([
          MultiplayerProfileModel.findOneAndUpdate(
            {
              userId: new Types.ObjectId(winnerId),
              gameId: finishedMatch.gameId,
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
              gameId: finishedMatch.gameId,
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

      // Get user names for match end message
      const winnerUser = await UserModel.findById(winnerId, 'name').session(session);
      const loserUser = await UserModel.findById(loserId, 'name').session(session);

      let endMessage: any;

      if (tie) {
        endMessage = createMatchEventMessage('Match ended in a tie!');
      } else if (quitUserId) {
        endMessage = createUserActionMessage('wins by forfeit!', winnerId, winnerUser?.name || 'Winner');
      } else {
        endMessage = createUserActionMessage('wins the match!', winnerId, winnerUser?.name || 'Winner');
      }

      [newFinishedMatch, ] = await Promise.all([
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
                eloWinner: getRatingFromProfile(userWinner, finishedMatch.type) || MULTIPLAYER_INITIAL_ELO,
                eloLoser: getRatingFromProfile(userLoser, finishedMatch.type) || MULTIPLAYER_INITIAL_ELO,
                eloChangeWinner: eloChangeWinner,
                eloChangeLoser: eloChangeLoser,
                winnerProvisional: winnerProvisional,
                loserProvisional: loserProvisional,
                winner: userWinner,
                loser: userLoser, // even though it may be a tie, calling it loser just for clarity...
              }),
              chatMessages: endMessage
            }
          },
          {
            new: true,
            session: session,
          }
        ).lean<MultiplayerMatch>(),

        queueRefreshAchievements(finishedMatch.gameId, new Types.ObjectId(winnerId), [AchievementCategory.MULTIPLAYER]),
        queueRefreshAchievements(finishedMatch.gameId, new Types.ObjectId(loserId), [AchievementCategory.MULTIPLAYER]),
      ]);

      if (!newFinishedMatch) {
        throw new Error('Failed to finish match');
      }
    });
  } catch (e) {
    logger.error(`Error finishing match ${finishedMatch.matchId}:`, e);
    session.endSession();
  }

  if (!newFinishedMatch) {
    logger.error(`Match ${finishedMatch.matchId} was not successfully updated to FINISHED state`);
  }

  return newFinishedMatch as MultiplayerMatch | null;
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
  ).lean<MultiplayerMatch>();

  if (!finishedMatch) {
    return null;
  }

  if (finishedMatch.markedReady.length !== finishedMatch.players.length) {
    return await abortMatch(matchId, finishedMatch.createdBy._id);
  } else {
    // All players ready, match is starting - add system message
    await MultiplayerMatchModel.updateOne(
      { matchId: matchId },
      {
        $push: {
          chatMessages: createMatchEventMessage('Match has started! Good luck!')
        }
      }
    );

    return null;
  }
}

export async function checkForFinishedMatch(matchId: string) {
  logger.info(`Checking if match ${matchId} is finished`);

  const finishedMatch = await MultiplayerMatchModel.findOne(
    {
      matchId: matchId,
      endTime: {
        $lte: new Date(),
      },
      state: MultiplayerMatchState.ACTIVE,
    },
  ).lean<MultiplayerMatch>();

  if (!finishedMatch) {
    // Additional logging to help debug
    const anyMatch = await MultiplayerMatchModel.findOne({ matchId: matchId }).lean();

    if (anyMatch) {
      logger.info(`Match ${matchId} exists but not ready to finish: state=${anyMatch.state}, endTime=${anyMatch.endTime}, currentTime=${new Date()}`);
    } else {
      logger.info(`Match ${matchId} does not exist at all`);
    }

    return null;
  }

  logger.info(`Match ${matchId} is finished, calling finishMatch`);
  const result = await finishMatch(finishedMatch);

  if (result) {
    logger.info(`Match ${matchId} successfully finished and transitioned to ${result.state}`);
  } else {
    logger.error(`Match ${matchId} failed to finish - finishMatch returned null`);
  }

  return result;
}

async function createMatch(req: NextApiRequestWithAuth) {
  const game = getGameFromId(req.gameId);

  if (game.disableMultiplayer) {
    return { match: null, errorCode: 400, errorMessage: 'Multiplayer is disabled for this game' };
  }

  const isPrivate: boolean = req.body.private;
  const rated: boolean = req.body.rated;
  const reqUser = req.user;
  const type: MultiplayerMatchType = req.body.type;
  const session = await mongoose.startSession();
  let match: MultiplayerMatch | null = null;
  let errorCode = 500, errorMessage = 'Error creating match';

  try {
    await session.withTransaction(async () => {
      const involvedMatch = await MultiplayerMatchModel.findOne(
        {
          players: reqUser._id,
          state: {
            $in: [MultiplayerMatchState.ACTIVE, MultiplayerMatchState.OPEN],
          },
          gameId: req.gameId,
        }, {}, { session: session }
      ).lean<MultiplayerMatch>();

      if (involvedMatch) {
        errorCode = 400;
        errorMessage = 'You are already involved in a match';
        throw new Error(errorMessage);
      }

      const matchId = SlugUtil.makeId(11);
      const matchUrl = `${req.headers.origin}/match/${matchId}`;

      const matchCreate = await MultiplayerMatchModel.create([{
        createdBy: reqUser._id,
        gameId: req.gameId,
        matchId: matchId,
        matchLog: [
          generateMatchLog(MatchAction.CREATE, {
            userId: reqUser._id,
          }),
        ],
        chatMessages: [
          createUserActionMessage('created this match.', reqUser._id.toString(), reqUser.name)
        ],
        players: [reqUser._id],
        private: isPrivate,
        rated: rated,
        state: MultiplayerMatchState.OPEN,
        type: type,
      }], { session: session });

      match = matchCreate[0] as MultiplayerMatch;

      if (!match.private) {
        const discordChannel = game.id === GameId.SOKOPATH ? DiscordChannel.SokopathMultiplayer : DiscordChannel.PathologyMultiplayer;
        const discordMessage = `New *${multiplayerMatchTypeToText(type)}* match created by **${reqUser.name}**! [Join here](<${matchUrl}>)`;

        await queueDiscordWebhook(discordChannel, discordMessage);
      }

      enrichMultiplayerMatch(match, reqUser._id.toString());
      errorCode = 200;
      errorMessage = '';
    });
    session.endSession();
  } catch (e) {
    logger.error(e);
    session.endSession();
  }

  return { match, errorCode, errorMessage };
}

/**
 * Gets open and active matches by default
 * @param reqUser
 * @param matchFilters
 * @returns
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAllMatches(gameId: GameId, reqUser?: User, matchFilters: any = null) {
  if (!matchFilters) {
    matchFilters = {
      private: false,
      state: {
        $in: [MultiplayerMatchState.ACTIVE, MultiplayerMatchState.OPEN],
      }
    };
  }

  matchFilters.gameId = gameId;
  const lookupPipelineUser: PipelineStage[] = getEnrichLevelsPipelineSteps(reqUser);

  const [matches] = await Promise.all([
    MultiplayerMatchModel.aggregate<MultiplayerMatch>([
      {
        $match: matchFilters,
      },
      {
        $lookup: {
          from: UserModel.collection.name,
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
                from: MultiplayerProfileModel.collection.name,
                localField: '_id',
                foreignField: 'userId',
                as: 'multiplayerProfile',
                pipeline: [
                  {
                    $match: {
                      gameId: gameId,
                    }
                  },
                ]
              }
            },
            {
              $unwind: {
                path: '$multiplayerProfile',
                preserveNullAndEmptyArrays: true,
              }
            },
            ...getEnrichUserConfigPipelineStage(gameId),
          ],
        }
      },
      {
        $lookup: {
          from: UserModel.collection.name,
          localField: 'winners',
          foreignField: '_id',
          as: 'winners',
          pipeline: [
            {
              $project: USER_DEFAULT_PROJECTION,
            },
            ...getEnrichUserConfigPipelineStage(gameId),
          ],
        }
      },
      {
        $lookup: {
          from: UserModel.collection.name,
          localField: 'createdBy',
          foreignField: '_id',
          as: 'createdBy',
          pipeline: [
            {
              $project: USER_DEFAULT_PROJECTION,
            },
            ...getEnrichUserConfigPipelineStage(gameId),
          ],
        }
      },
      {
        $unwind: '$createdBy',
      },
      {
        $lookup: {
          from: UserModel.collection.name,
          localField: 'chatMessages.userId',
          foreignField: '_id',
          as: 'chatMessageUsers',
          pipeline: [
            {
              $project: USER_DEFAULT_PROJECTION,
            },
          ],
        }
      },
      {
        $addFields: {
          chatMessages: {
            $cond: {
              if: { $isArray: '$chatMessages' },
              then: {
                $map: {
                  input: '$chatMessages',
                  as: 'msg',
                  in: {
                    $mergeObjects: [
                      '$$msg',
                      {
                        userId: {
                          $cond: {
                            if: { $eq: ['$$msg.userId', null] },
                            then: null, // Keep null for system messages
                            else: {
                              $arrayElemAt: [
                                {
                                  $filter: {
                                    input: '$chatMessageUsers',
                                    as: 'user',
                                    cond: { $eq: ['$$user._id', '$$msg.userId'] }
                                  }
                                },
                                0
                              ]
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              },
              else: []
            }
          }
        }
      },
      {
        $project: {
          chatMessageUsers: 0, // Remove the temporary field
        }
      },
      {
        $lookup: {
          from: LevelModel.collection.name,
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
                from: UserModel.collection.name,
                localField: 'userId',
                foreignField: '_id',
                as: 'userId',
                pipeline: [
                  {
                    $project: USER_DEFAULT_PROJECTION,
                  },
                  ...getEnrichUserConfigPipelineStage(gameId),
                ],
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
      const matches = await getAllMatches(req.gameId, req.user);

      return res.status(200).json(matches);
    } else if (req.method === 'POST') {
      // first check if user already is involved in a match
      let match;

      try {
        const { match: cMatch, errorCode, errorMessage } = await createMatch(req);

        match = cMatch as unknown as MultiplayerMatch;

        if (errorCode !== 200) {
          return res.status(errorCode).json({ error: errorMessage });
        }
      } catch (e) {
        logger.error(e);

        return res.status(500).json({ error: 'Something went wrong' });
      }

      if (!match) {
        return res
          .status(500)
          .json({ error: 'Something went wrong creating the match' });
      }

      await requestBroadcastMatches(match.gameId);

      return res.status(200).json(match);
    }
  }
);
