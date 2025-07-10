import { Types } from 'mongoose';
import GraphType from '../constants/graphType';
import { GraphModel } from '../models/mongoose';

// Simple cache to avoid repeated database lookups in the same request
const blockedCache = new Map<string, string[]>();

export async function getBlockedUserIds(userId?: string | Types.ObjectId): Promise<string[]> {
  if (!userId) return [];

  const userIdStr = userId.toString();

  // Return cached result if available
  if (blockedCache.has(userIdStr)) {
    return blockedCache.get(userIdStr) || [];
  }

  const blockedGraphs = await GraphModel.find({
    source: userId,
    sourceModel: 'User',
    type: GraphType.BLOCK,
    targetModel: 'User',
  }).lean();

  const blockedIds = blockedGraphs.map(graph => graph.target.toString());

  // Cache the result
  blockedCache.set(userIdStr, blockedIds);

  return blockedIds;
}

export async function checkIfBlocked(userId: string, blockedUserId: string) {
  return await GraphModel.exists({
    source: new Types.ObjectId(userId),
    sourceModel: 'User',
    type: GraphType.BLOCK,
    targetModel: 'User',
    target: new Types.ObjectId(blockedUserId),
  });
}

// Optional: method to clear cache if needed
export function clearBlockedCache(userId?: string) {
  if (userId) {
    blockedCache.delete(userId);
  } else {
    blockedCache.clear();
  }
}
