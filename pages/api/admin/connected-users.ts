import Role from '@root/constants/role';
import { ValidObjectId } from '@root/helpers/apiWrapper';
import { logger } from '@root/helpers/logger';
import withAuth, { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { UserModel } from '@root/models/mongoose';
import { Types } from 'mongoose';
import { NextApiResponse } from 'next';

interface ConnectedUsersBodyProps {
  userId: string;
}

export default withAuth({
  POST: {
    body: {
      userId: ValidObjectId(true),
    }
  }
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (!req.user.roles.includes(Role.ADMIN)) {
    return res.status(401).json({
      error: 'Not authorized'
    });
  }

  const { userId } = req.body as ConnectedUsersBodyProps;

  try {
    // MongoDB aggregation pipeline to find connected users via shared IP addresses
    const result = await UserModel.aggregate([
      {
        $match: {
          _id: new Types.ObjectId(userId)
        }
      },
      {
        $project: {
          ip_addresses_used: {
            $filter: {
              input: '$ip_addresses_used',
              as: 'ip',
              cond: {
                $and: [
                  { $ne: ['$$ip', ''] },
                  { $ne: ['$$ip', null] }
                ]
              }
            }
          },
          name: 1
        }
      },
      {
        $match: {
          $expr: {
            $gt: [
              { $size: '$ip_addresses_used' },
              0
            ]
          }
        }
      },
      {
        $graphLookup: {
          from: 'users',
          startWith: '$ip_addresses_used',
          connectFromField: 'ip_addresses_used',
          connectToField: 'ip_addresses_used',
          as: 'connected',
          maxDepth: 10,
          restrictSearchWithMatch: {
            ip_addresses_used: {
              $exists: true,
              $ne: [],
              $not: { $size: 0 }
            }
          }
        }
      },
      {
        $addFields: {
          allUsers: {
            $map: {
              input: '$connected',
              as: 'doc',
              in: {
                _id: '$$doc._id',
                name: '$$doc.name',
                email: '$$doc.email',
                roles: '$$doc.roles',
                ts: '$$doc.ts',
                last_visited_at: '$$doc.last_visited_at'
              }
            }
          },
          allIPs: {
            $reduce: {
              input: {
                $map: {
                  input: '$connected',
                  as: 'doc',
                  in: '$$doc.ip_addresses_used'
                }
              },
              initialValue: [],
              in: { $setUnion: ['$$value', '$$this'] }
            }
          }
        }
      },
      {
        $project: {
          users: {
            $setUnion: [
              [{
                _id: { $toString: '$_id' },
                name: '$name',
                email: '$email',
                roles: '$roles',
                ts: '$ts',
                last_visited_at: '$last_visited_at'
              }],
              '$allUsers'
            ]
          },
          distinctIPs: '$allIPs',
          numUsers: { $size: {
            $setUnion: [
              [{
                _id: { $toString: '$_id' },
                name: '$name',
                email: '$email',
                roles: '$roles',
                ts: '$ts',
                last_visited_at: '$last_visited_at'
              }],
              '$allUsers'
            ]
          } },
          numDistinctIPs: { $size: '$allIPs' }
        }
      },
      {
        $unwind: '$users'
      },
      {
        $sort: {
          'users.last_visited_at': -1 // Sort by last visit descending (most recent first)
        }
      },
      {
        $group: {
          _id: '$_id',
          users: { $push: '$users' },
          distinctIPs: { $first: '$distinctIPs' },
          numUsers: { $first: '$numUsers' },
          numDistinctIPs: { $first: '$numDistinctIPs' }
        }
      }
    ]);

    if (result.length === 0) {
      // User not found or has no IP addresses
      return res.status(200).json({
        users: [],
        distinctIPs: [],
        numUsers: 0,
        numDistinctIPs: 0
      });
    }

    const data = result[0];

    // Convert ObjectIds to strings for serialization
    const users = data.users.map((user: any) => ({
      ...user,
      _id: user._id.toString(),
      roles: user.roles || []
    }));

    return res.status(200).json({
      users,
      distinctIPs: data.distinctIPs || [],
      numUsers: data.numUsers || 0,
      numDistinctIPs: data.numDistinctIPs || 0
    });
  } catch (error) {
    logger.error('Error fetching connected users:', error);

    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});
