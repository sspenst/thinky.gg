import { MultiplayerRecord, MultiplayerRecords } from '@root/components/profile/profileMultiplayer';
import { ValidObjectId } from '@root/helpers/apiWrapper';
import withAuth, { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { MultiplayerMatchState, MultiplayerMatchType } from '@root/models/constants/multiplayer';
import { MultiplayerMatchModel } from '@root/models/mongoose';
import { Types } from 'mongoose';
import { NextApiResponse } from 'next';

export default withAuth(
  {
    GET: {
      query: {
        player: ValidObjectId(false),
        compareUser: ValidObjectId(false),
      },
    },
  },
  async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
    const { player, compareUser } = req.query;
    const user = new Types.ObjectId(player as string);
    const vs = compareUser ? new Types.ObjectId(compareUser as string) : undefined;
    const agg = await MultiplayerMatchModel.aggregate([
      {
        // first match all where players contains user and rated is true
        $match: {
          // check if vs is set, if so check if players contains both user and vs, otherwise just check if players contains user
          players: vs ? { $all: [user._id, vs] } : user._id,
          rated: true,
          state: MultiplayerMatchState.FINISHED,
          gameId: req.gameId,
        }
      },
      // we need to end with the MultiplayerRecords data format, so we need to group by user and match type
      {
        $group: {
          _id: {
            type: '$type',
          },
          wins: {
            $sum: {
              $cond: [
                {
                  // check if winners contains user and is length 1
                  $and: [
                    {
                      $in: [user._id, '$winners']
                    },
                    {
                      $eq: [{ $size: '$winners' }, 1]
                    }
                  ]

                },
                1,
                0
              ]
            }
          },
          losses: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      // check if winners does not contain user
                      $not: {
                        $in: [user._id, '$winners']
                      }
                    },
                    {
                      // check if winners is not length 0
                      $ne: [{ $size: '$winners' }, 0]
                    }
                  ]
                },
                1,
                0
              ]
            }
          },
          draws: {
            $sum: {
              $cond: [
                {
                  // check if winners is empty
                  $eq: [{ $size: '$winners' }, 0]
                },
                1,
                0
              ]
            }
          }
        }
      },

    ]);

    // convert to object where each key is the type
    const multiplayerRecords = {} as MultiplayerRecords;

    for (const obj of agg) {
      multiplayerRecords[obj._id.type as MultiplayerMatchType] = {
        draws: obj.draws,
        losses: obj.losses,
        wins: obj.wins,
      } as MultiplayerRecord;
    }

    res.status(200).json(multiplayerRecords);
  }
);
