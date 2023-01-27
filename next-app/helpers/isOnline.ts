import User from '../models/db/user';
import { TimerUtil } from './getTs';

export default function isOnline(user: User) {
  // active in the last 15 minutes
  const onlineThreshold = TimerUtil.getTs() - 15 * 60;
  const lastVisitedAt = user.last_visited_at ?? 0;

  return lastVisitedAt > onlineThreshold;
}
