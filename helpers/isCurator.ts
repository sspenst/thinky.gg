import UserConfig from '@root/models/db/userConfig';
import Role from '../constants/role';
import User, { ReqUser } from '../models/db/user';

export default function isCurator(user: User | ReqUser | UserConfig | undefined | null): boolean {
  if (!user || !user.roles) {
    return false;
  }

  if (user.roles.includes(Role.CURATOR) || user.roles.includes(Role.ADMIN)) {
    return true;
  } else if ((user as User).config?.roles?.includes(Role.CURATOR) || (user as User).config?.roles?.includes(Role.ADMIN)) {
    return true;
  }

  return false;
}
