import User from '../models/db/user';

export default function cleanUser(user?: User | null) {
  if (user?.hideStatus) { // note that user may be undefined if they were deleted
    user.last_visited_at = undefined;
  }

  const ONE_DAY = 24 * 60 * 60 * 1000;
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  if (user?.config?.lastPlayedAt) {
    const lastPlayedAt = new Date(user?.config?.lastPlayedAt);
    const lastPlayedAtDay = new Date(lastPlayedAt.setHours(0, 0, 0, 0));

    if (lastPlayedAtDay.getTime() < today.getTime() - ONE_DAY) {
      user.config.calcCurrentStreak = 0;
    }

    // also hide lastPlayedAt
    user.config.lastPlayedAt = undefined;
  }
}
