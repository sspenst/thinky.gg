import Discord from '@root/constants/discord';
import queueDiscordWebhook from '@root/helpers/discordWebhook';
import { Types } from 'mongoose';
import { NextApiResponse } from 'next';
import { DIFFICULTY_NAMES, getDifficultyRangeFromDifficultyName } from '../../../components/difficultyDisplay';
import { ValidEnum } from '../../../helpers/apiWrapper';
import { logger } from '../../../helpers/logger';
import { requestBroadcastMatch, requestBroadcastMatches, requestBroadcastPrivateAndInvitedMatches, requestClearBroadcastMatchSchedule, requestScheduleBroadcastMatch } from '../../../lib/appSocketToClient';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import MultiplayerMatch from '../../../models/db/multiplayerMatch';
import User from '../../../models/db/user';
import { LevelModel, MultiplayerMatchModel } from '../../../models/mongoose';
import { MatchAction, MultiplayerMatchState, MultiplayerMatchType, MultiplayerMatchTypeDurationMap } from '../../../models/MultiplayerEnums';
import { enrichMultiplayerMatch, generateMatchLog, SKIP_MATCH_LEVEL_ID } from '../../../models/schemas/multiplayerMatchSchema';
import { finishMatch, getAllMatches, multiplayerMatchTypeToText } from '.';

export async function abortMatch(matchId: string, userId: Types.ObjectId) {
  await requestClearBroadcastMatchSchedule(matchId);
  const log = generateMatchLog(MatchAction.ABORTED, {
    userId: userId,
  });
  const updatedMatch = await MultiplayerMatchModel.updateOne(
    {
      matchId: matchId,
      state: MultiplayerMatchState.ACTIVE,
    },
    {
      state: MultiplayerMatchState.ABORTED,
      $push: {
        matchLog: log,
      },
    },
  );

  return updatedMatch.modifiedCount > 0;
}

export async function quitMatch(matchId: string, userId: Types.ObjectId) {
  const log = generateMatchLog(MatchAction.QUIT, {
    userId: userId,
  });

  let updatedMatch = await MultiplayerMatchModel.findOneAndUpdate(
    {
      matchId: matchId,
      players: userId,
      $or: [
        {
          startTime: { $gte: Date.now() },
          state: MultiplayerMatchState.ACTIVE,
        },
        {
          state: MultiplayerMatchState.OPEN,
        },
      ]
    },
    {
      $pull: {
        players: userId,
      },
      $push: {
        matchLog: log,
      },
      state: MultiplayerMatchState.ABORTED,
    },
    { new: true, lean: true, populate: ['players', 'winners', 'levels'] }
  );

  if (!updatedMatch) {
    updatedMatch = await MultiplayerMatchModel.findOne({ matchId: matchId, players: userId, state: MultiplayerMatchState.ACTIVE }, {}, { lean: true });

    if (!updatedMatch) {
      logger.error('Could not find match ' + matchId);

      return null;
    }

    await finishMatch(updatedMatch, userId.toString());
  }

  enrichMultiplayerMatch(updatedMatch, userId.toString());
  await requestBroadcastMatch(matchId as string);
  await requestBroadcastMatches();
  await requestClearBroadcastMatchSchedule(
    updatedMatch.matchId,
  );
  await requestClearBroadcastMatchSchedule(
    updatedMatch.matchId,
  );

  return updatedMatch;
}

export async function MatchMarkSkipLevel(
  userId: Types.ObjectId,
  matchId: string,
  levelId: Types.ObjectId,
) {
  const skipId = new Types.ObjectId(SKIP_MATCH_LEVEL_ID);

  const updated = await MultiplayerMatchModel.updateOne(
    {
      matchId: matchId,
      players: userId,
      // check if scoreTable.{req.userId} is set
      [`gameTable.${userId.toString()}`]: { $exists: true },
      [`gameTable.${userId.toString()}`]: { $ne: skipId },
      // check if game is active
      state: MultiplayerMatchState.ACTIVE,

      // check endTime is before now
      endTime: { $gte: new Date() },
    },
    {
      // add all zeros to mark skipped
      $addToSet: { [`gameTable.${userId.toString()}`]: skipId },
      $push: {
        matchLog: generateMatchLog(MatchAction.SKIP_LEVEL, {
          userId: userId,
          levelId: levelId,
        }),
      },
    }
  );

  await requestBroadcastMatch(matchId);
  await requestBroadcastMatches();

  return updated;
}

export async function MatchMarkCompleteLevel(
  userId: Types.ObjectId,
  matchId: string,
  levelId: Types.ObjectId,
) {
  const updated = await MultiplayerMatchModel.findOneAndUpdate(
    {
      matchId: matchId,
      players: userId,
      // check if scoreTable.{req.userId} is set
      [`gameTable.${userId.toString()}`]: { $exists: true },
      // make sure this level is in the levels array
      levels: levelId,
      // check if game is active
      state: MultiplayerMatchState.ACTIVE,
      // check endTime is before now
      endTime: { $gte: new Date() },
    },
    {
      // increment the scoreTable.{req.userId} by 1
      $addToSet: { [`gameTable.${userId}`]: levelId },
      $push: {
        matchLog: generateMatchLog(MatchAction.COMPLETE_LEVEL, {
          userId: userId,
          levelId: levelId,
        }),
      },
    }
  ) as MultiplayerMatch;
  /*
// TODO later
  let maxLength = 0;

  for (const entry in updated.gameTable) {
    maxLength = Math.max(maxLength, updated.gameTable[entry.length].length);
  }

  const len = updated.levels.length;

  if (maxLength >= len) {
    // generate another 30 levels

  }*/

  await Promise.all([requestBroadcastMatch(matchId), requestBroadcastMatches()]);

  return updated;
}

export async function getMatch(matchId: string, reqUser?: User) {
  // populate players, winners, and levels
  const matches = await getAllMatches(reqUser, { matchId: matchId });

  if (matches.length === 0) {
    return null;
  }

  return matches[0];
}

/**
 *
 * @param difficultyMin
 * @param difficultyMax Pass the same value as min to make it a single difficulty
 * @param levelCount
 * @param excludeLevelIds
 * @returns
 */
export async function generateLevels(
  difficultyMin: DIFFICULTY_NAMES,
  difficultyMax: DIFFICULTY_NAMES,
  options: {
    minSteps?: number;
    maxSteps?: number;
    minLaplace?: number;
    maxWidth?: number;
    maxHeight?: number;
  },
  levelCount: number,
) {
  // generate a new level based on criteria...
  const MIN_STEPS = options.minSteps || 8;
  const MAX_STEPS = options.maxSteps || 100;
  const MAX_WIDTH = options.maxWidth || 25;
  const MAX_HEIGHT = options.maxHeight || 25;
  const MIN_REVIEWS = 3;
  const MIN_LAPLACE = options.minLaplace || 0.3;
  const [difficultyRangeMin] =
    getDifficultyRangeFromDifficultyName(difficultyMin);
  const [, difficultyRangeMax] =
    getDifficultyRangeFromDifficultyName(difficultyMax);

  const levels = await LevelModel.aggregate<Level>([
    {
      $match: {
        isDeleted: { $ne: true },
        isDraft: false,
        leastMoves: {
          // least moves between 10 and 100
          $gte: MIN_STEPS,
          $lte: MAX_STEPS,
        },
        calc_difficulty_estimate: {
          $gte: difficultyRangeMin,
          $lt: difficultyRangeMax,
          $exists: true,
        },
        calc_reviews_count: {
          // at least 3 reviews
          $gte: MIN_REVIEWS,
        },
        calc_reviews_score_laplace: {
          $gte: MIN_LAPLACE,
        },
        width: {
          $lte: MAX_WIDTH,
        },
        height: {
          $lte: MAX_HEIGHT,
        }
      },
    },
    {
      $addFields: {
        tmpOrder: { $rand: {} },
      },
    },
    {
      $sort: {
        tmpOrder: 1,
      },
    },
    {
      $limit: levelCount,
    },
    {
      $sort: {
        calc_difficulty_estimate: 1,
      },
    },
    {
      $project: {
        _id: 1,
        leastMoves: 1
      },
    },
  ]);

  return levels;
}

export default withAuth(
  {
    GET: {},
    PUT: {
      body: {
        action: ValidEnum([
          MatchAction.JOIN,
          MatchAction.MARK_READY,
          MatchAction.QUIT,
          MatchAction.SKIP_LEVEL,
        ]),
      },
    },
  },
  async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
    const { matchId } = req.query;

    if (req.method === 'GET') {
      const match = await getMatch(matchId as string, req.user);

      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }

      return res.status(200).json(match);
    } else if (req.method === 'PUT') {
      const { action, levelId } = req.body;

      if (action === MatchAction.MARK_READY) {
        const updateMatch = await MultiplayerMatchModel.updateOne(
          {
            matchId: matchId,
            players: req.user._id,
            state: MultiplayerMatchState.ACTIVE,
            startTime: {
              $gte: new Date(), // has not started yet but about to start
            }
          },
          {
            $addToSet: { markedReady: req.user._id },
          }
        );

        if (updateMatch.modifiedCount === 0) {
          return res.status(400).json({
            error: 'Cannot mark yourself ready in this match',
          });
        }

        await requestBroadcastMatch(matchId as string);

        return res.status(200).json({ success: true });
      } else if (action === MatchAction.JOIN) {
        // joining this match... Should also start the match!
        const involvedMatch = await MultiplayerMatchModel.findOne<MultiplayerMatch>(
          {
            players: req.user._id,
            state: {
              $in: [MultiplayerMatchState.ACTIVE, MultiplayerMatchState.OPEN],
            },
          },
          {},
          { lean: true }
        );

        if (involvedMatch && involvedMatch.matchId !== matchId) {
          // if reqUser is involved in their own match (still OPEN), then we
          // can safely quit that match and allow them to join the new match
          if (involvedMatch.state === MultiplayerMatchState.OPEN) {
            await quitMatch(matchId as string, req.user._id);
          } else {
            return res.status(400).json({
              error:
                'You are already involved in a match that has started. Quit one to join this one.',
            });
          }
        }

        const log = generateMatchLog(MatchAction.JOIN, {
          userId: req.user._id,
        });
        const match = await MultiplayerMatchModel.findOne<MultiplayerMatch>({
          matchId: matchId,
        }) as MultiplayerMatch;

        const updatedMatch = await MultiplayerMatchModel.findOneAndUpdate(
          {
            matchId: matchId,
            state: MultiplayerMatchState.OPEN,
            players: {
              $nin: [req.user._id],
              // size should be 1
              $size: 1,
            },
          },
          {
            $push: {
              players: req.user._id,
              matchLog: log,
            },
            startTime: Date.now() + 15000, // start 15 seconds into the future...
            endTime: Date.now() + 15000 + MultiplayerMatchTypeDurationMap[match.type as MultiplayerMatchType], // end 3 minute after start
            state: MultiplayerMatchState.ACTIVE,
          },
          { new: true, lean: true, populate: ['players', 'winners', 'levels'] }
        );

        if (!updatedMatch) {
          res
            .status(400)
            .json({ error: 'Match not found or you are already in the match' });

          return;
        }

        if (updatedMatch.players.length === 2) {
          const level0s = generateLevels(
            DIFFICULTY_NAMES.KINDERGARTEN,
            DIFFICULTY_NAMES.ELEMENTARY,
            {
              minSteps: 6,
              maxSteps: 25,
              minLaplace: 0.5,
            },
            10
          );
          const level1s = generateLevels(
            DIFFICULTY_NAMES.JUNIOR_HIGH,
            DIFFICULTY_NAMES.HIGH_SCHOOL,
            {},
            20
          );
          const level2s = generateLevels(
            DIFFICULTY_NAMES.BACHELORS,
            DIFFICULTY_NAMES.PROFESSOR,
            {},
            5
          );
          const level3s = generateLevels(
            DIFFICULTY_NAMES.PHD,
            DIFFICULTY_NAMES.SUPER_GRANDMASTER,
            {},
            5
          );
          const [l0, l1, l2, l3] = await Promise.all([
            level0s,
            level1s,
            level2s,
            level3s,
          ]);

          // dedupe these level ids, just in case though it should be extremely rare
          const dedupedLevels = new Set([...l0, ...l1, ...l2, ...l3]);

          // add levels to match
          const matchUrl = 'https://pathology.gg/match/' + matchId;
          const discordMessage = multiplayerMatchTypeToText(match.type) + ' match starting between ' + updatedMatch.players?.map((p: User) => (p as User).name).join(' and ') + '! <Spectate>(' + matchUrl + ')';

          console.log(discordMessage);
          Promise.all([await MultiplayerMatchModel.updateOne(
            { matchId: matchId },
            {
              levels: [...dedupedLevels].map((level: Level) => level._id),
              gameTable: {
                [updatedMatch.players[0]._id]: [],
                [updatedMatch.players[1]._id]: [],
              },
            }
          ),
          queueDiscordWebhook(Discord.Multiplayer, discordMessage)
          ]);
        }

        enrichMultiplayerMatch(updatedMatch, req.userId);
        await Promise.all([requestBroadcastMatches(),
          requestBroadcastPrivateAndInvitedMatches(req.user._id),
          requestBroadcastMatch(updatedMatch.matchId),
          requestScheduleBroadcastMatch(
            updatedMatch.matchId
          )]);

        return res.status(200).json(updatedMatch);
      } else if (action === MatchAction.QUIT) {
        const updatedMatch = await quitMatch(matchId as string, req.user._id);

        if (!updatedMatch) {
          return res.status(400).json({ error: 'Match not found' });
        }

        await requestBroadcastPrivateAndInvitedMatches(req.user._id);

        return res.status(200).json(updatedMatch);
      } else if (action === MatchAction.SKIP_LEVEL) {
        // skipping level
        const result = await MatchMarkSkipLevel(
          req.user._id,
          matchId as string,
          levelId,
        );

        return result.modifiedCount === 1
          ? res.status(200).json({ success: true })
          : res.status(400).json({ error: 'Already used skip' });
      }
    }
  }
);
