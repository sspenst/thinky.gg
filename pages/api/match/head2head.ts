import { GameId } from '@root/constants/GameId';
import { ValidCommaSeparated, ValidObjectId } from '@root/helpers/apiWrapper';
import withAuth, { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { MultiplayerMatchState } from '@root/models/constants/multiplayer';
import { MultiplayerMatchModel } from '@root/models/mongoose';
import { Types } from 'mongoose';
import { NextApiResponse } from 'next';

export async function getHeadToHeadMultiplayerRecord( gameId: GameId, reqUserId: Types.ObjectId | undefined, userId: Types.ObjectId) {
  const result = await MultiplayerMatchModel.aggregate([
    {
      $match: {
        gameId: gameId,
        state: MultiplayerMatchState.FINISHED,
        rated: true,
        players: {
          $all: [userId, reqUserId], // Ensure both players are in the match
        }
      },
    },
    {
      $project: {
        wins: {
          $cond: {
            if: {
              $in: [reqUserId, '$winners']
            },
            then: 1,
            else: 0,
          }
        },
        ties: {
          $cond: {
            if: {
              $eq: ['$winners', []]
            },
            then: 1,
            else: 0,
          }
        },
        losses: {
          $cond: {
            if: {
              $in: [userId, '$winners']
            },
            then: 1,
            else: 0,
          }
        },
      },
    },
    {
      // Summing the results to get total wins, ties, and losses
      $group: {
        _id: null,
        totalWins: { $sum: '$wins' },
        totalTies: { $sum: '$ties' },
        totalLosses: { $sum: '$losses' }
      }
    },
    {
      $project: {
        _id: 0,
        totalWins: 1,
        totalTies: 1,
        totalLosses: 1,
      }
    }
  ]);

  if (result.length === 0) {
    return {
      totalWins: 0,
      totalTies: 0,
      totalLosses: 0,
    };
  }

  return result[0];
}

export default withAuth(
  {
    GET: {
      query: {
        players: ValidCommaSeparated(true, ValidObjectId(true)),
      },
    },
  },
  async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
    const { players } = req.query;
    const playersMap = ((players as string)?.split(','))?.map((id: string) => new Types.ObjectId(id.toString()));
    const record = await getHeadToHeadMultiplayerRecord(req.gameId, playersMap[0], playersMap[1]);

    res.status(200).json(record);
  }
);
