import { Types } from 'mongoose';
import User from '../models/db/user';
import { getBlockedUserIds } from './getBlockedUserIds';

/**
 * Prepares a MongoDB query filter that excludes content from blocked users
 */
export async function getContentFilterForBlockedUsers(
  reqUser?: User | null,
  userIdField: string = 'userId'
): Promise<Record<string, any>> {
  if (!reqUser?._id) return {};

  const blockedUserIds = await getBlockedUserIds(reqUser._id);

  if (blockedUserIds.length === 0) return {};

  // Create a MongoDB query filter to exclude content from blocked users
  return { [userIdField]: { $nin: blockedUserIds.map(id =>
    typeof id === 'string' ? new Types.ObjectId(id) : id) } };
}

/**
 * Helper to filter multiple collections simultaneously
 */
export async function applyBlockFiltersToQueries(
  reqUser?: User | null,
  ...filterConfigs: { queryObj: Record<string, any>, userIdField: string }[]
): Promise<void> {
  if (!reqUser?._id) return;

  // Get the blocked user IDs once
  const blockedUserIds = await getBlockedUserIds(reqUser._id);

  if (blockedUserIds.length === 0) return;

  // Convert IDs to ObjectIds once
  const blockedObjectIds = blockedUserIds.map(id =>
    typeof id === 'string' ? new Types.ObjectId(id) : id);

  // Apply the filter to each query object
  for (const config of filterConfigs) {
    config.queryObj[config.userIdField] = {
      ...config.queryObj[config.userIdField],
      $nin: blockedObjectIds
    };
  }
}
