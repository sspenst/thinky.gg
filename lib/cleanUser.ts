import User from '../models/db/user';

export function cleanUser(user: User) {
  if (user.hideStatus) {
    user.last_visited_at = undefined;
  }
}
