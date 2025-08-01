import { MultiplayerMatchHistoryFilters } from '@root/components/profile/profileMultiplayer';
import { GameId } from '@root/constants/GameId';
import { ValidCommaSeparated, ValidEnum, ValidNumber, ValidObjectId, ValidType } from '@root/helpers/apiWrapper';
import { getEnrichUserConfigPipelineStage } from '@root/helpers/enrich';
import withAuth, { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { MultiplayerMatchState } from '@root/models/constants/multiplayer';
import { USER_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import { MultiplayerMatchModel, MultiplayerProfileModel, UserModel } from '@root/models/mongoose';
import { enrichMultiplayerMatch } from '@root/models/schemas/multiplayerMatchSchema';
import { Types } from 'mongoose';
import { NextApiResponse } from 'next';

interface MatchQuery {
  matchId?: string;
  limit?: number;
  offset?: number;
  filter?: MultiplayerMatchHistoryFilters;
  players?: Types.ObjectId[];
  rated?: boolean;
}

async function doMatchQuery(gameId: GameId, query: MatchQuery) {
  let gameIdToUse: GameId | undefined = gameId;

  if (gameId === GameId.THINKY) {
    gameIdToUse = undefined;
  }

  const searchObj = {
    state: MultiplayerMatchState.FINISHED,
    ...(gameIdToUse !== undefined) ? { gameId: gameIdToUse } : {}
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

  if (query.rated) {
    searchObj['rated'] = query.rated;
  }

  if (query.filter) {
    switch (query.filter) {
    case MultiplayerMatchHistoryFilters.Wins:
      searchObj['winners'] = {
        $in: query.players
      };
      break;
    case MultiplayerMatchHistoryFilters.Losses:
      // check if not in winners AND that winners is not empty
      searchObj['winners'] = {
        $not: {
          $in: query.players
        },
        $ne: []
      };
      break;
    case MultiplayerMatchHistoryFilters.Draws:
      searchObj['winners'] = {
        $size: 0
      };
      break;
    }
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
        from: UserModel.collection.name,
        localField: 'players',
        foreignField: '_id',
        as: 'players',
        pipeline: [
          {
            $project: {
              ...USER_DEFAULT_PROJECTION
            }
          },
          ...getEnrichUserConfigPipelineStage(gameIdToUse, { excludeCalcs: true }),
          ...(gameIdToUse !== undefined
            ? [{
              $lookup: {
                from: MultiplayerProfileModel.collection.name,
                localField: '_id',
                foreignField: 'userId',
                as: 'multiplayerProfile',
                pipeline: [
                  {
                    $match: {
                      gameId: gameIdToUse
                    }
                  },
                ]
              }
            }]
            : []
          ),
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
    },
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
        filter: ValidEnum(Object.values(MultiplayerMatchHistoryFilters), false),
        rated: ValidType('boolean', false, true),
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
      filter: req.query.filter as MultiplayerMatchHistoryFilters,
      rated: req.query.rated === 'true',
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    };

    const matches = await doMatchQuery(req.gameId, query);

    res.status(200).json(matches);
  }
);
