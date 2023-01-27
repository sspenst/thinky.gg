import User from '../models/db/user';

export default function getProfileSlug(user: User) {
  return '/profile/' + user.name.toLowerCase();
}
