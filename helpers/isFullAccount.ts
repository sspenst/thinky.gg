import { UserConfigModel } from '@root/models/mongoose';
import Role from '../constants/role';
import User from '../models/db/user';
import UserConfig from '../models/db/userConfig';

export default async function isFullAccount(user: User | null, userConfig?: UserConfig | null) {
  if (!user || user.roles?.includes(Role.GUEST)) {
    return false;
  }

  if (!userConfig) {
    userConfig = await UserConfigModel.findOne<UserConfig>({ userId: user._id });
  }

  return userConfig?.emailConfirmed;
}
