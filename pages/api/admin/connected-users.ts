import Role from '@root/constants/role';
import { ValidObjectId } from '@root/helpers/apiWrapper';
import { logger } from '@root/helpers/logger';
import withAuth, { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { LevelModel, ReviewModel, UserModel } from '@root/models/mongoose';
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
            $setUnion: [
              [{
                _id: { $toString: '$_id' },
                name: '$name',
                email: '$email',
                roles: '$roles',
                ts: '$ts',
                last_visited_at: '$last_visited_at'
              }],
              {
                $map: {
                  input: '$connected',
                  as: 'doc',
                  in: {
                    _id: { $toString: '$$doc._id' },
                    name: '$$doc.name',
                    email: '$$doc.email',
                    roles: '$$doc.roles',
                    ts: '$$doc.ts',
                    last_visited_at: '$$doc.last_visited_at'
                  }
                }
              }
            ]
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
          },
          allEmailDomains: {
            $reduce: {
              input: {
                $concatArrays: [
                  [{
                    $cond: {
                      if: {
                        $and: [
                          { $ne: ['$email', null] },
                          { $ne: ['$email', ''] },
                          { $regexMatch: { input: '$email', regex: /@/ } }
                        ]
                      },
                      then: {
                        $trim: {
                          input: {
                            $arrayElemAt: [
                              { $split: ['$email', '@'] },
                              1
                            ]
                          }
                        }
                      },
                      else: null
                    }
                  }],
                  {
                    $map: {
                      input: '$connected',
                      as: 'doc',
                      in: {
                        $cond: {
                          if: {
                            $and: [
                              { $ne: ['$$doc.email', null] },
                              { $ne: ['$$doc.email', ''] },
                              { $regexMatch: { input: '$$doc.email', regex: /@/ } }
                            ]
                          },
                          then: {
                            $trim: {
                              input: {
                                $arrayElemAt: [
                                  { $split: ['$$doc.email', '@'] },
                                  1
                                ]
                              }
                            }
                          },
                          else: null
                        }
                      }
                    }
                  }
                ]
              },
              initialValue: [],
              in: {
                $cond: {
                  if: { $ne: ['$$this', null] },
                  then: { $setUnion: ['$$value', ['$$this']] },
                  else: '$$value'
                }
              }
            }
          }
        }
      },
      {
        $addFields: {
          uniqueUsers: {
            $reduce: {
              input: '$allUsers',
              initialValue: [],
              in: {
                $cond: {
                  if: {
                    $in: ['$$this._id', { $map: { input: '$$value', as: 'u', in: '$$u._id' } }]
                  },
                  then: '$$value',
                  else: { $concatArrays: ['$$value', ['$$this']] }
                }
              }
            }
          }
        }
      },
      {
        $project: {
          users: '$uniqueUsers',
          distinctIPs: '$allIPs',
          distinctEmailDomains: '$allEmailDomains',
          numUsers: { $size: '$uniqueUsers' },
          numDistinctIPs: { $size: '$allIPs' },
          numDistinctEmailDomains: { $size: '$allEmailDomains' }
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
          distinctEmailDomains: { $first: '$distinctEmailDomains' },
          numUsers: { $first: '$numUsers' },
          numDistinctIPs: { $first: '$numDistinctIPs' },
          numDistinctEmailDomains: { $first: '$numDistinctEmailDomains' }
        }
      }
    ]);

    if (result.length === 0) {
      // User not found or has no IP addresses
      return res.status(200).json({
        users: [],
        distinctIPs: [],
        distinctEmailDomains: [],
        numUsers: 0,
        numDistinctIPs: 0,
        numDistinctEmailDomains: 0
      });
    }

    const data = result[0];

    // Convert ObjectIds to strings for serialization
    const users = data.users.map((user: any) => ({
      ...user,
      _id: user._id.toString(),
      roles: user.roles || []
    }));

    // Get user IDs for additional queries
    const userIds = users.map((user: any) => new Types.ObjectId(user._id));

    // Get published levels count for each user
    const levelsCountResult = await LevelModel.aggregate([
      {
        $match: {
          userId: { $in: userIds },
          isDraft: false,
          isDeleted: { $ne: true }
        }
      },
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get reviews count for each user
    const reviewsCountResult = await ReviewModel.aggregate([
      {
        $match: {
          userId: { $in: userIds },
          isDeleted: { $ne: true }
        }
      },
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 }
        }
      }
    ]);

    // Create maps for easy lookup
    const levelsCountMap = new Map();

    levelsCountResult.forEach((item: any) => {
      levelsCountMap.set(item._id.toString(), item.count);
    });

    const reviewsCountMap = new Map();

    reviewsCountResult.forEach((item: any) => {
      reviewsCountMap.set(item._id.toString(), item.count);
    });

    // Merge counts into user data
    const usersWithCounts = users.map((user: any) => ({
      ...user,
      publishedLevelsCount: levelsCountMap.get(user._id) || 0,
      reviewsCount: reviewsCountMap.get(user._id) || 0
    }));

    return res.status(200).json({
      users: usersWithCounts,
      distinctIPs: data.distinctIPs || [],
      distinctEmailDomains: data.distinctEmailDomains || [],
      numUsers: data.numUsers || 0,
      numDistinctIPs: data.numDistinctIPs || 0,
      numDistinctEmailDomains: data.numDistinctEmailDomains || 0
    });
  } catch (error) {
    logger.error('Error fetching connected users:', error);

    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});
