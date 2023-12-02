import { UserConfigModel } from '@root/models/mongoose';
import User from '../models/db/user';
import UserConfig from '../models/db/userConfig';
import isGuest from './isGuest';

export default async function isFullAccount(user: User | null, userConfig?: UserConfig | null) {
  if (!user || isGuest(user)) {
    return false;
  }

  if (!userConfig) {
    userConfig = await UserConfigModel.findOne<UserConfig>({ userId: user._id });
  }

  return user?.emailConfirmed;
}
