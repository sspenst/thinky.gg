import { MultiplayerMatchType } from '../models/constants/multiplayer';
import { UserWithMultiplayerProfile } from '../models/db/user';
import { getRatingFromProfile, isProvisional } from './multiplayerHelperFunctions';

export default function sortByRating(a: UserWithMultiplayerProfile, b: UserWithMultiplayerProfile, type: MultiplayerMatchType) {
  // Safety checks for undefined users
  if (!a || !b) {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
  }

  const aprofile = a?.multiplayerProfile;
  const bprofile = b?.multiplayerProfile;

  if (isProvisional(type, aprofile)) {
    // if both users are provisional, then sort by name
    if (isProvisional(type, bprofile)) {
      return (a.name || '').toLowerCase() < (b.name || '').toLowerCase() ? -1 : 1;
    }

    // otherwise, sort a to the bottom
    return 1;
  }

  const aRating = aprofile ? getRatingFromProfile(aprofile, type) ?? 0 : 0;
  const bRating = bprofile ? getRatingFromProfile(bprofile, type) ?? 0 : 0;

  return bRating - aRating;
}
