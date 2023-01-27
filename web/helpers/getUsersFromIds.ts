import { ObjectId } from 'bson';
import cleanUser from '../lib/cleanUser';
import { UserWithMultiplayerProfile } from '../models/db/user';
import { UserModel } from '../models/mongoose';
import { USER_DEFAULT_PROJECTION } from '../models/schemas/userSchema';

export default async function getUsersFromIds(ids: ObjectId[]): Promise<UserWithMultiplayerProfile[]> {
  const users = await UserModel.aggregate([
    {
      $match: {
        _id: {
          $in: ids,
        },
      },
    },
    // join with multiplayer profile
    {
      $lookup: {
        from: 'multiplayerprofiles',
        localField: '_id',
        foreignField: 'userId',
        as: 'multiplayerProfile',
      },
    },
    {
      $unwind: {
        path: '$multiplayerProfile',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        ...USER_DEFAULT_PROJECTION,
        multiplayerProfile: 1

      }
    },
  ]) as UserWithMultiplayerProfile[];

  users.forEach(user => cleanUser(user));

  return users;
}
