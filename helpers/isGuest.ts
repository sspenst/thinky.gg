import Role from '../constants/role';
import User, { ReqUser } from '../models/db/user';

export default function isGuest(user: User | ReqUser | undefined | null) {
  return user?.roles?.includes(Role.GUEST);
}
