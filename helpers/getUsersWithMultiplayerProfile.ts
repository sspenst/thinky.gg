import { GameId } from '@root/constants/GameId';
import { USER_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import { FilterQuery, PipelineStage, Types } from 'mongoose';
import cleanUser from '../lib/cleanUser';
import { UserWithMultiplayerProfile } from '../models/db/user';
import { MultiplayerProfileModel, UserModel } from '../models/mongoose';
import { getEnrichUserConfigPipelineStage } from './enrich';

export async function getUsersWithMultiplayerProfileFromIds(gameId: GameId | undefined, ids: Types.ObjectId[]) {
  return getUsersWithMultiplayerProfile(gameId, { _id: { $in: ids } }, {});
}

export async function getUsersWithMultiplayerProfile(
  gameId: GameId | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  match: FilterQuery<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  project: { [field: string]: any },
): Promise<UserWithMultiplayerProfile[]> {
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
    ...(gameId && gameId !== GameId.THINKY ? getEnrichUserConfigPipelineStage(gameId) : []) as PipelineStage[],
  ]) as UserWithMultiplayerProfile[];

  users.forEach(user => cleanUser(user));

  return users;
}
