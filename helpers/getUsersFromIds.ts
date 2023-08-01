import { Types } from 'mongoose';
import cleanUser from '../lib/cleanUser';
import { UserWithMultiplayerProfile } from '../models/db/user';
import { UserModel } from '../models/mongoose';
import { USER_DEFAULT_PROJECTION } from '../models/schemas/userSchema';

export async function getUsersFromIds(ids: Types.ObjectId[]) {
  return getUsers({
    _id: {
      $in: ids
    }
  }, {});
}

export default async function getUsers(match: any, additionalFields: any): Promise<UserWithMultiplayerProfile[]> {
  const users = await UserModel.aggregate([
    {
      $match: match
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
        ...additionalFields,
        multiplayerProfile: 1

      }
    },
  ]) as UserWithMultiplayerProfile[];

  users.forEach(user => cleanUser(user));

  return users;
}
