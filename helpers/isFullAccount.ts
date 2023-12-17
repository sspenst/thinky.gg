import User from '../models/db/user';
import isGuest from './isGuest';

export default function isFullAccount(user: User | null) {
  if (!user || isGuest(user)) {
    return false;
  }

  return !!user.emailConfirmed;
}
