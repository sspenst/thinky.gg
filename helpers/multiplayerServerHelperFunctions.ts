import User from '@root/models/db/user';
import { MultiplayerMatchModel } from '@root/models/mongoose';
import { MultiplayerMatchState } from '@root/models/MultiplayerEnums';
import { Types } from 'mongoose';

export async function getMultiplayerRecords(user: Types.ObjectId, vs?: Types.ObjectId) {
  const agg = await MultiplayerMatchModel.aggregate([
    {
      // first match all where players contains user and rated is true
      $match: {
        // check if vs is set, if so check if players contains both user and vs, otherwise just check if players contains user
        players: vs ? { $all: [user._id, vs] } : user._id,
        rated: true,
        state: MultiplayerMatchState.FINISHED
      }
    },
    /**
     * we need to end with the following data format
     {
        recordRushBullet?: { wins: number; losses: number; draws: number };
        recordRushBlitz?: { wins: number; losses: number; draws: number };
        recordRushRapid?: { wins: number; losses: number; draws: number };
        recordRushClassical?: { wins: number; losses: number; draws: number };
     }

        * so we need to group by user and match type
     */
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
  const aggObj = {} as { [key: string]: { wins: number; losses: number; draws: number } };

  for (const obj of agg) {
    aggObj[obj._id.type] = {
      wins: obj.wins,
      losses: obj.losses,
      draws: obj.draws
    };
  }

  return aggObj;
}
