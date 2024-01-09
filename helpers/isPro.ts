import UserConfig from '@root/models/db/userConfig';
import Role from '../constants/role';
import User, { ReqUser } from '../models/db/user';

export default function isPro(user: User | ReqUser | UserConfig | undefined | null): boolean {
  if (!user || !user.roles) {
    return false;
  }

  if (user.roles.includes(Role.PRO) || user.roles.includes(Role.ADMIN)) {
    return true;
  } else if ((user as User).config?.roles?.includes(Role.PRO) || (user as User).config?.roles?.includes(Role.ADMIN)) {
    return true;
  }

  return false;
}
