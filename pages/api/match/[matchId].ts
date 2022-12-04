import { ObjectId } from 'bson';
import { NextApiResponse } from 'next';
import { DIFFICULTY_NAMES, getDifficultyRangeFromDifficultyName } from '../../../components/difficultyDisplay';
import { ValidEnum } from '../../../helpers/apiWrapper';
import { logger } from '../../../helpers/logger';
import { requestBroadcastMatch, requestBroadcastMatches, requestClearBroadcastMatchSchedule, requestScheduleBroadcastMatch } from '../../../lib/appSocketToClient';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import MultiplayerMatch from '../../../models/db/multiplayerMatch';
import User from '../../../models/db/user';
import { LevelModel, MultiplayerMatchModel } from '../../../models/mongoose';
import { MatchAction, MultiplayerMatchState } from '../../../models/MultiplayerEnums';
import { enrichMultiplayerMatch, generateMatchLog, SKIP_MATCH_LEVEL_ID } from '../../../models/schemas/multiplayerMatchSchema';
import { finishMatch, getAllMatches } from '.';

export async function quitMatch(matchId: string, userId: ObjectId) {
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
        },
        {
          state: MultiplayerMatchState.OPEN,
        }
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
    updatedMatch = await MultiplayerMatchModel.findOne({ matchId: matchId, players: userId }, {}, { lean: true });

    if (!updatedMatch) {
      logger.error('Could not find match ' + matchId);

      return null;
    }

    await finishMatch(updatedMatch, userId.toString());
  }

  enrichMultiplayerMatch(updatedMatch, userId.toString());
  requestBroadcastMatch(matchId as string);
  requestBroadcastMatches();
  requestClearBroadcastMatchSchedule(
    updatedMatch.matchId,
  );
  requestClearBroadcastMatchSchedule(
    updatedMatch.matchId,
  );

  return updatedMatch;
}

export async function MatchMarkSkipLevel(
  userId: ObjectId,
  matchId: string,
  levelId: ObjectId,
) {
  const skipId = new ObjectId(SKIP_MATCH_LEVEL_ID);

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

  requestBroadcastMatch(matchId);

  return updated;
}

export async function MatchMarkCompleteLevel(
  userId: ObjectId,
  matchId: string,
  levelId: ObjectId,
) {
  const updated = await MultiplayerMatchModel.updateOne(
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
  );

  requestBroadcastMatch(matchId);

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
  },
  levelCount: number,
) {
  // generate a new level based on criteria...
  const MIN_STEPS = options.minSteps || 8;
  const MAX_STEPS = options.maxSteps || 100;
  const MIN_REVIEWS = 3;
  const MIN_LAPLACE = options.minLaplace || 0.3;
  const [difficultyRangeMin] =
    getDifficultyRangeFromDifficultyName(difficultyMin);
  const [, difficultyRangeMax] =
    getDifficultyRangeFromDifficultyName(difficultyMax);

  const levels = await LevelModel.aggregate<Level>([
    {
      $match: {
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

      if (action === MatchAction.JOIN) {
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
            startTime: Date.now() + 10000, // start 10 seconds into the future...
            endTime: Date.now() + 10000 + 60000 * 3, // end 3 minute after start
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
            10
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
          await MultiplayerMatchModel.updateOne(
            { matchId: matchId },
            {
              levels: [...dedupedLevels].map((level: Level) => level._id),
              gameTable: {
                [updatedMatch.players[0]._id]: [],
                [updatedMatch.players[1]._id]: [],
              },
            }
          );
        }

        enrichMultiplayerMatch(updatedMatch, req.userId);
        requestBroadcastMatches();
        requestScheduleBroadcastMatch(
          updatedMatch.matchId
        );

        return res.status(200).json(updatedMatch);
      } else if (action === MatchAction.QUIT) {
        const updatedMatch = await quitMatch(matchId as string, req.user._id);

        if (!updatedMatch) {
          return res.status(400).json({ error: 'Match not found' });
        }

        return res.status(200).json(updatedMatch);
      } else if (action === MatchAction.SKIP_LEVEL) {
        // skipping level
        const result = await MatchMarkSkipLevel(
          req.user._id,
          matchId as string,
          levelId,
        );

        await requestBroadcastMatch(matchId as string);

        return result.modifiedCount === 1
          ? res.status(200).json({ success: true })
          : res.status(400).json({ error: 'Already used skip' });
      }
    }
  }
);
