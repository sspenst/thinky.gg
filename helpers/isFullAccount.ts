import { GameId } from '@root/constants/GameId';
import UserConfig from '@root/models/db/userConfig';
import { UserConfigModel } from '@root/models/mongoose';
import User from '../models/db/user';
import isGuest from './isGuest';

export default async function isFullAccount(gameId: GameId, user: User | null, userConfig?: UserConfig | null) {
  if (!user || isGuest(user)) {
    return false;
  }

  if (!userConfig) {
    userConfig = await UserConfigModel.findOne<UserConfig>({ userId: user._id, gameId: gameId });
  }

  return user?.emailConfirmed;
}
