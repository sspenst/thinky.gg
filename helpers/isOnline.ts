import User from '../models/db/user';
import getTs from './getTs';

export default function isOnline(user: User) {
  // active in the last 15 minutes
  const onlineThreshold = getTs() - 15 * 60;
  const lastVisitedAt = user.last_visited_at ?? 0;

  return lastVisitedAt > onlineThreshold;
}
