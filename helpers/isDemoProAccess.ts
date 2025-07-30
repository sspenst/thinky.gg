import { EnrichedLevel } from '@root/models/db/level';
import User, { ReqUser } from '@root/models/db/user';
import mongoose from 'mongoose';
import isPro from './isPro';

export const DEMO_USERNAME = 'k2xl';
const DEMO_LEVEL_SLUG = 'k2xl/touchdown';
const DEMO_LEVEL_ID = '62d4cac704b23000689c3d16';

export function isDemoProLevel(level: EnrichedLevel | mongoose.Types.ObjectId | null): boolean {
  if (!level) return false;

  if (level instanceof mongoose.Types.ObjectId) {
    return level.equals(DEMO_LEVEL_ID);
  }

  return level.userId?.name === DEMO_USERNAME && level.slug === DEMO_LEVEL_SLUG;
}

export function isDemoProProfile(user: User | null): boolean {
  if (!user) return false;

  return user.name === DEMO_USERNAME;
}

export function hasProAccessForLevel(user: ReqUser | User | null | undefined, level: EnrichedLevel | mongoose.Types.ObjectId | null): boolean {
  // Regular Pro users always have access
  if (isPro(user)) return true;

  // Demo access for the specific level
  if (isDemoProLevel(level)) return true;

  return false;
}

export function hasProAccessForProfile(user: User | ReqUser | null, profileUser: User | null): boolean {
  // Regular Pro users always have access
  if (isPro(user)) return true;

  // Demo access for the specific profile
  if (isDemoProProfile(profileUser)) return true;

  return false;
}
