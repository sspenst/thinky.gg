import { getMatchCountFromProfile } from '../components/matchStatus';
import MultiplayerProfile from '../models/db/multiplayerProfile';
import { MultiplayerMatchType } from '../models/MultiplayerEnums';

export const MUTLIPLAYER_PROVISIONAL_GAME_LIMIT = 5;

export function isProvisional(type: MultiplayerMatchType, profile?: MultiplayerProfile): boolean {
  return !profile || getMatchCountFromProfile(profile, type) < MUTLIPLAYER_PROVISIONAL_GAME_LIMIT;
}
