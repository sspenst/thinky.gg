import { ObjectId } from 'bson';
import { NextApiResponse } from 'next';
import {
  DIFFICULTY_NAMES,
  getDifficultyRangeFromDifficultyName,
} from '../../../components/difficultyDisplay';
import { ValidEnum } from '../../../helpers/apiWrapper';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import User from '../../../models/db/user';
import { LevelModel, MultiplayerMatchModel } from '../../../models/mongoose';
import {
  MatchAction,
  MultiplayerMatchState,
} from '../../../models/MultiplayerEnums';
import { LEVEL_DEFAULT_PROJECTION } from '../../../models/schemas/levelSchema';
import {
  enrichMultiplayerMatch,
  generateMatchLog,
} from '../../../models/schemas/multiplayerMatchSchema';
import { USER_DEFAULT_PROJECTION } from '../../../models/schemas/userSchema';
import {
  broadcastMatch,
  broadcastMatches,
  clearBroadcastMatchSchedule,
  scheduleBroadcastMatch,
} from '../../socket';
import { checkForFinishedMatches } from '.';

export async function MatchMarkSkipLevel(userId: ObjectId, matchId: string) {
  const skipId = new ObjectId('000000000000000000000000');

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
        }),
      },
    }
  );

  await broadcastMatch(matchId);

  return updated;
}

export async function MatchMarkCompleteLevel(
  userId: ObjectId,
  matchId: string,
  levelId: ObjectId
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

  await broadcastMatch(matchId);

  return updated;
}

export async function getMatch(matchId: string, reqUser?: User) {
  // populate players, winners, and levels
  const [match] = await Promise.all([
    MultiplayerMatchModel.findOne(
      { matchId: matchId },
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

  if (!match) {
    return null;
  }

  if (reqUser) {
    enrichMultiplayerMatch(match, reqUser._id.toString());
  }

  return match;
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
  levelCount: number,
  excludeLevelIds?: string[] | null
) {
  // generate a new level based on criteria...
  const MIN_STEPS = 8;
  const MAX_STEPS = 100;
  const MIN_REVIEWS = 3;
  const MIN_LAPLACE = 0.5;
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
        _id: {
          $nin: excludeLevelIds || [],
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
      const { action } = req.body;

      if (action === MatchAction.JOIN) {
        // joining this match... Should also start the match!
        const involvedMatch = await MultiplayerMatchModel.findOne(
          {
            players: req.user._id,
            state: {
              $in: [MultiplayerMatchState.ACTIVE, MultiplayerMatchState.OPEN],
            },
          },
          {},
          { lean: true }
        );

        if (involvedMatch) {
          return res.status(400).json({
            error:
              'You are already involved in a match. Leave that to join this one.',
          });
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
            10
          );
          const level1s = generateLevels(
            DIFFICULTY_NAMES.JUNIOR_HIGH,
            DIFFICULTY_NAMES.HIGH_SCHOOL,
            10
          );
          const level2s = generateLevels(
            DIFFICULTY_NAMES.BACHELORS,
            DIFFICULTY_NAMES.PROFESSOR,
            5
          );
          const level3s = generateLevels(
            DIFFICULTY_NAMES.PHD,
            DIFFICULTY_NAMES.SUPER_GRANDMASTER,
            5
          );
          const [l1, l2, l3] = await Promise.all([
            level0s,
            level1s,
            level2s,
            level3s,
          ]);
          // dedupe these level ids, just in case though it should be extremely rare
          const generatedLevels = new Set([...l1, ...l2, ...l3]);

          // add levels to match
          await MultiplayerMatchModel.updateOne(
            { matchId: matchId },
            {
              levels: [...generatedLevels].map((level: Level) => level._id),
              gameTable: {
                [updatedMatch.players[0]._id]: [],
                [updatedMatch.players[1]._id]: [],
              },
            }
          );
        }

        enrichMultiplayerMatch(updatedMatch, req.userId);
        await broadcastMatches();
        await scheduleBroadcastMatch(
          updatedMatch.matchId,
          new Date(updatedMatch.startTime)
        );
        await scheduleBroadcastMatch(
          updatedMatch.matchId,
          new Date(updatedMatch.endTime)
        );

        return res.status(200).json(updatedMatch);
      } else if (action === MatchAction.QUIT) {
        const log = generateMatchLog(MatchAction.QUIT, {
          userId: req.user,
        });

        const updatedMatch = await MultiplayerMatchModel.findOneAndUpdate(
          {
            matchId: matchId,
            state: {
              $nin: [
                MultiplayerMatchState.FINISHED,
                MultiplayerMatchState.ABORTED,
              ],
            },
            players: req.user._id,
          },
          {
            $pull: {
              players: req.user._id,
            },
            $push: {
              matchLog: log,
            },
            state: MultiplayerMatchState.ABORTED,
          },
          { new: true, lean: true, populate: ['players', 'winners', 'levels'] }
        );

        if (!updatedMatch) {
          res.status(400).json({ error: 'Could not leave match' });

          return;
        }

        enrichMultiplayerMatch(updatedMatch, req.userId);
        await broadcastMatch(matchId as string);
        await broadcastMatches();
        await clearBroadcastMatchSchedule(
          updatedMatch.matchId,
          new Date(updatedMatch.startTime)
        );
        await clearBroadcastMatchSchedule(
          updatedMatch.matchId,
          new Date(updatedMatch.endTime)
        );

        return res.status(200).json(updatedMatch);
      } else if (action === MatchAction.SKIP_LEVEL) {
        // skipping level
        const result = await MatchMarkSkipLevel(
          req.user._id,
          matchId as string
        );

        await broadcastMatch(matchId as string);

        return result.modifiedCount === 1
          ? res.status(200).json({ success: true })
          : res.status(400).json({ error: 'Already used skip' });
      }
    }
  }
);
