import User from '../models/db/user';

export default function getProfileSlug(user: User | null | undefined) {
  if (!user?.name) {
    return '/profile';
  }

  return '/profile/' + user.name.toLowerCase();
}
