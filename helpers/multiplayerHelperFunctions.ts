import { MultiplayerMatchType } from '../models/constants/multiplayer';
import MultiplayerProfile from '../models/db/multiplayerProfile';

export const MUTLIPLAYER_PROVISIONAL_GAME_LIMIT = 5;

export function isProvisional(type: MultiplayerMatchType, profile?: MultiplayerProfile | null): boolean {
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

export function getMatchTypeNameFromMatchType(type: MultiplayerMatchType): string {
  switch (type) {
  case MultiplayerMatchType.RushBullet:
    return 'Bullet';
  case MultiplayerMatchType.RushBlitz:
    return 'Blitz';
  case MultiplayerMatchType.RushRapid:
    return 'Rapid';
  case MultiplayerMatchType.RushClassical:
    return 'Classical';
  }
}

export function getRatingFromProfile(profile: MultiplayerProfile, type: MultiplayerMatchType) {
  switch (type) {
  case MultiplayerMatchType.RushBullet:
    return profile.ratingRushBullet;
  case MultiplayerMatchType.RushBlitz:
    return profile.ratingRushBlitz;
  case MultiplayerMatchType.RushRapid:
    return profile.ratingRushRapid;
  case MultiplayerMatchType.RushClassical:
    return profile.ratingRushClassical;
  }
}

export function getMatchCountFromProfile(profile: MultiplayerProfile, type: MultiplayerMatchType) {
  switch (type) {
  case MultiplayerMatchType.RushBullet:
    return profile.calcRushBulletCount || 0;
  case MultiplayerMatchType.RushBlitz:
    return profile.calcRushBlitzCount || 0;
  case MultiplayerMatchType.RushRapid:
    return profile.calcRushRapidCount || 0;
  case MultiplayerMatchType.RushClassical:
    return profile.calcRushClassicalCount || 0;
  }
}
