import MultiplayerProfile from '../models/db/multiplayerProfile';

export const MUTLIPLAYER_PROVISIONAL_GAME_LIMIT = 5;

export function isProvisional(profile?: MultiplayerProfile): boolean {
  return !profile || profile.calc_matches_count < MUTLIPLAYER_PROVISIONAL_GAME_LIMIT;
}
