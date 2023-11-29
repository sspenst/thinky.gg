import { GameId } from '@root/constants/GameId';
import { UserConfigModel } from '@root/models/mongoose';
import User from '../models/db/user';
import UserConfig from '../models/db/userConfig';
import isGuest from './isGuest';

export default async function isFullAccount(gameId: GameId, user: User | null, userConfig?: UserConfig | null) {
  if (!user || isGuest(user)) {
    return false;
  }

  if (!userConfig) {
    userConfig = await UserConfigModel.findOne<UserConfig>({ userId: user._id, gameId: gameId });
  }

  //TODO: We need to move email confirmed to user model... since it is shared across games
  return userConfig?.emailConfirmed;
}
