import { GameId } from '@root/constants/GameId';
import dbConnect from '@root/lib/dbConnect';
import { FilterQuery, Types } from 'mongoose';
import cleanUser from '../lib/cleanUser';
import { UserWithMultiplayerProfile } from '../models/db/user';
import { MultiplayerProfileModel, UserModel } from '../models/mongoose';
import { USER_DEFAULT_PROJECTION } from '../models/schemas/userSchema';

export async function getUsersWithMultiplayerProfileFromIds(gameId: GameId, ids: Types.ObjectId[]) {
  return getUsersWithMultiplayerProfile(gameId, { _id: { $in: ids } }, {});
}

export async function getUsersWithMultiplayerProfile(
  gameId: GameId,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  match: FilterQuery<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  project: { [field: string]: any },
): Promise<UserWithMultiplayerProfile[]> {
  await dbConnect();

  const users = await UserModel.aggregate([
    {
      $match: match
    },

    // join with multiplayer profile
    {
      $lookup: {
        from: MultiplayerProfileModel.collection.name,
        localField: '_id',
        foreignField: 'userId',
        as: 'multiplayerProfile',
      },
    },
    {
      $project: {
        ...USER_DEFAULT_PROJECTION,
        ...project,
        multiplayerProfile: 1,
      }
    },
    //...getEnrichUserConfigPipelineStage(gameId),
  ]) as UserWithMultiplayerProfile[];

  users.forEach(user => cleanUser(user));

  return users;
}
