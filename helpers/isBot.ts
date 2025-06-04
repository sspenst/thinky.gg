import UserConfig from '@root/models/db/userConfig';
import Role from '../constants/role';
import User, { ReqUser } from '../models/db/user';

export default function isBot(user: User | ReqUser | UserConfig | undefined | null): boolean {
  if (!user || !user.roles) {
    return false;
  }

  if (user.roles.includes(Role.BOT)) {
    return true;
  } else if ((user as User).config?.roles?.includes(Role.BOT)) {
    return true;
  }

  return false;
}
