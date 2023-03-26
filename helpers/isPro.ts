import Role from '../constants/role';
import User, { ReqUser } from '../models/db/user';

export default function isPro(user: User | ReqUser | undefined) {
  return user?.roles?.includes(Role.PRO) || user?.roles?.includes(Role.ADMIN);
}
