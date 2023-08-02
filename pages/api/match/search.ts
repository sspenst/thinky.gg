import { ValidCommaSeparated, ValidNumber, ValidObjectId, ValidType } from '@root/helpers/apiWrapper';
import withAuth, { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { MultiplayerMatchModel } from '@root/models/mongoose';
import { MultiplayerMatchState } from '@root/models/MultiplayerEnums';
import { enrichMultiplayerMatch } from '@root/models/schemas/multiplayerMatchSchema';
import { USER_DEFAULT_PROJECTION } from '@root/models/schemas/userSchema';
import { Types } from 'mongoose';
import { NextApiResponse } from 'next';

interface MatchQuery {
  matchId?: string;
  limit?: number;
  offset?: number;
  players?: Types.ObjectId[];
}

async function doMatchQuery(query: MatchQuery) {
  const searchObj = {
    state: MultiplayerMatchState.FINISHED,
    // private: false // TODO: seems right to show private matches...
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  if (query.players) {
    searchObj['players'] = {
      $all: query.players
    };
  }

  if (query.matchId) {
    searchObj['matchId'] = query.matchId;
  }

  const agg = await MultiplayerMatchModel.aggregate([
    { $match: searchObj },
    {
      $sort: {
        endTime: -1
      }
    },
    {
      $skip: query.offset || 0
    },
    {
      $limit: query.limit || 10
    },
    {
      $lookup: {
        from: 'users',
        localField: 'players',
        foreignField: '_id',
        as: 'players',
        pipeline: [
          {
            $project: {
              ...USER_DEFAULT_PROJECTION
            }
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
        ]
      },
    },
    {
      $project: {
        levels: 0,
        markedReady: 0,
      }
    }

  ]);

  // clean users
  for (const match of agg) {
    enrichMultiplayerMatch(match);
  }

  return agg;
}

export default withAuth(
  {
    GET: {
      query: {
        players: ValidCommaSeparated(false, ValidObjectId(false)),
        matchId: ValidType('string', false),
        limit: ValidNumber(false, 1, 100),
        offset: ValidNumber(false, 0, 1000)
      },
    },
  },
  async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
    const { players, matchId, limit, offset } = req.query;

    const query: MatchQuery = {
      players: ((players as string)?.split(','))?.map((id: string) => new Types.ObjectId(id.toString())),
      matchId: matchId as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    };

    const matches = await doMatchQuery(query);

    res.status(200).json(matches);
  }
);
