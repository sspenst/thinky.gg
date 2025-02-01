import UserConfig from '@root/models/db/userConfig';
import User from '../models/db/user';

export const ONE_DAY = 24 * 60 * 60 * 1000;

export default function cleanUser(user?: User | null) {
  if (user?.hideStatus) { // note that user may be undefined if they were deleted
    user.last_visited_at = undefined;
  }

  const today = new Date();

  today.setUTCHours(0, 0, 0, 0);

  if (user?.config?.lastPlayedAt !== undefined) {
    const lastPlayedAt = new Date(user?.config?.lastPlayedAt);
    const lastPlayedAtDay = new Date(lastPlayedAt);

    lastPlayedAtDay.setUTCHours(0, 0, 0, 0);

    if (lastPlayedAtDay.getTime() < today.getTime() - ONE_DAY) {
      user.config.calcCurrentStreak = 0;
    }

    // also hide lastPlayedAt
    user.config.lastPlayedAt = undefined;
  }
}

export function getStreak(userConfig: UserConfig) {
  const streak = userConfig.calcCurrentStreak;
  const lastPlayedAt = userConfig.lastPlayedAt;

  if (!lastPlayedAt) {
    return { streak: streak || 0, timeToKeepStreak: 0 };
  }

  // return 0 if ONE_DAY has passed since lastPlayedAt
  const today = new Date();

  today.setUTCHours(0, 0, 0, 0);

  const lastPlayedAtDate = new Date(lastPlayedAt);
  const lastPlayedDay = new Date(lastPlayedAtDate);

  lastPlayedDay.setUTCHours(0, 0, 0, 0);

  if (lastPlayedDay.getTime() < today.getTime() - ONE_DAY) {
    return { streak: 0, timeToKeepStreak: 0 };
  }

  // If they haven't played today, calculate time until streak expires
  if (lastPlayedDay.getTime() < today.getTime()) {
    const nextDay = new Date(today.getTime() + ONE_DAY);
    const timeToKeepStreak = nextDay.getTime() - Date.now();

    return { streak, timeToKeepStreak };
  }

  return { streak, timeToKeepStreak: 0 };
}

export function getHasPlayedToday(lastPlayedAt: Date | string | null): boolean {
  if (!lastPlayedAt) return false;

  const today = new Date();

  today.setUTCHours(0, 0, 0, 0);
  const lastPlayed = new Date(lastPlayedAt);

  return lastPlayed.getTime() >= today.getTime();
}
