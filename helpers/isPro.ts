import Role from '../constants/role';
import User, { ReqUser } from '../models/db/user';

export default function isCurator(user: User | ReqUser | undefined) {
  return user?.roles?.includes(Role.PRO_SUBSCRIBER) || user?.roles?.includes(Role.ADMIN);
}
