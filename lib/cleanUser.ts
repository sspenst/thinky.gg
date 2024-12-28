import { GameId } from '@root/constants/GameId';
import User from '../models/db/user';
import UserConfig from '@root/models/db/userConfig';
export const ONE_DAY = 24 * 60 * 60 * 1000;

export default function cleanUser(user?: User | null) {
  if (user?.hideStatus) { // note that user may be undefined if they were deleted
    user.last_visited_at = undefined;
  }

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  if (user?.config?.lastPlayedAt !== undefined) {
    const lastPlayedAt = new Date(user?.config?.lastPlayedAt);
    const lastPlayedAtDay = new Date(lastPlayedAt.setHours(0, 0, 0, 0));

    if (lastPlayedAtDay.getTime() < today.getTime() - ONE_DAY) {
      user.config.calcCurrentStreak = 0;
    }

    // also hide lastPlayedAt
    user.config.lastPlayedAt = undefined;
  }
}

export function getStreak(userConfig: UserConfig, gameId: GameId) {
  const streak = userConfig.calcCurrentStreak;
  const lastPlayedAt = userConfig.lastPlayedAt;
  if (!lastPlayedAt) {
    return streak || 0;
  }
  // return 0 if ONE_DAY has passed since lastPlayedAt
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastPlayedAtDate = new Date(lastPlayedAt);
  if (lastPlayedAtDate && lastPlayedAtDate.getTime() < today.getTime() - ONE_DAY) {
    return 0;
  }
  return streak;
}


