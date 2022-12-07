import { UserWithMultiplayerProfile } from '../models/db/user';
import { isProvisional } from './multiplayerHelperFunctions';

export default function sortByRating(a: UserWithMultiplayerProfile, b: UserWithMultiplayerProfile) {
  if (isProvisional(a.multiplayerProfile)) {
    // if both users are provisional, then sort by name
    if (isProvisional(b.multiplayerProfile)) {
      return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
    }

    // otherwise, sort a to the bottom
    return 1;
  }

  const aRating = a.multiplayerProfile?.rating ?? 0;
  const bRating = b.multiplayerProfile?.rating ?? 0;

  return bRating - aRating;
}
