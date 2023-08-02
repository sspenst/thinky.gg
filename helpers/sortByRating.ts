import { UserWithMultiplayerProfile } from '../models/db/user';
import { MultiplayerMatchType } from '../models/MultiplayerEnums';
import { getRatingFromProfile, isProvisional } from './multiplayerHelperFunctions';

export default function sortByRating(a: UserWithMultiplayerProfile, b: UserWithMultiplayerProfile, type: MultiplayerMatchType) {
  const aprofile = a.multiplayerProfile;
  const bprofile = b.multiplayerProfile;

  if (isProvisional(type, aprofile)) {
    // if both users are provisional, then sort by name
    if (isProvisional(type, bprofile)) {
      return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
    }

    // otherwise, sort a to the bottom
    return 1;
  }

  const aRating = aprofile ? getRatingFromProfile(aprofile, type) ?? 0 : 0;
  const bRating = bprofile ? getRatingFromProfile(bprofile, type) ?? 0 : 0;

  return bRating - aRating;
}
