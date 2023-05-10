import { getMatchCountFromProfile } from '../components/matchStatus';
import MultiplayerProfile from '../models/db/multiplayerProfile';
import { MultiplayerMatchType } from '../models/MultiplayerEnums';

export const MUTLIPLAYER_PROVISIONAL_GAME_LIMIT = 5;

export function isProvisional(type: MultiplayerMatchType, profile?: MultiplayerProfile): boolean {
  return !profile || getMatchCountFromProfile(profile, type) < MUTLIPLAYER_PROVISIONAL_GAME_LIMIT;
}

export function multiplayerMatchTypeToText(type: MultiplayerMatchType) {
  switch (type) {
  case MultiplayerMatchType.RushBullet:
    return 'Bullet (3m)';
  case MultiplayerMatchType.RushBlitz:
    return 'Blitz (5m)';
  case MultiplayerMatchType.RushRapid:
    return 'Rapid (10m)';
  case MultiplayerMatchType.RushClassical:
    return 'Classical (30m)';
  }
}
