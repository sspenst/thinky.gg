import User from '../models/db/user';

export default function cleanUser(user?: User | null) {
  if (user?.hideStatus) { // note that user may be undefined if they were deleted
    user.last_visited_at = undefined;
  }
}
