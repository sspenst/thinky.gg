import Role from '../constants/role';
import User, { ReqUser } from '../models/db/user';

export default function isCurator(user: User | ReqUser | null | undefined) {
  return user?.roles?.includes(Role.ADMIN) || user?.roles?.includes(Role.CURATOR);
}
