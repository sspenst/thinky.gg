import Collection from '../models/db/collection';
import Level from '../models/db/level';
import Stat from '../models/db/stat';
import User from '../models/db/user';
import { StatModel } from '../models/mongoose';
import { EnrichedCollection, EnrichedLevel } from '../pages/search';
import cloneLevel from './cloneLevel';

export async function enrichCollection(collection: Collection, reqUser: User | null) {
  if (!reqUser) {
    return collection as EnrichedCollection;
  }

  const stats = await StatModel.find<Stat>({ userId: reqUser._id, levelId: { $in: collection.levels.map(level => level._id) } });
  let userCompletedCount = 0;

  collection.levels.forEach(level => {
    const stat = stats.find(stat => stat.levelId.equals(level._id));

    if (stat && stat.moves === level.leastMoves) {
      userCompletedCount++;
    }
  });

  // NB: omit levels array to reduce object size
  return {
    _id: collection._id,
    levelCount: collection.levels.length,
    name: collection.name,
    userCompletedCount: userCompletedCount,
  } as EnrichedCollection;
}

export async function enrichLevels(levels: Level[], reqUser: User | null) {
  if (!reqUser) {
    return levels as EnrichedLevel[];
  }

  const stats = await StatModel.find<Stat>({ userId: reqUser._id, levelId: { $in: levels.map(level => level._id) } });

  // map each stat to each level to create an EnrichedLevel
  return levels.map(level => {
    const stat = stats.find(stat => stat.levelId.equals(level._id));
    const enrichedLevel = cloneLevel(level) as EnrichedLevel;

    enrichedLevel.userAttempts = stat?.attempts;
    enrichedLevel.userMoves = stat?.moves;
    enrichedLevel.userMovesTs = stat?.ts;

    return enrichedLevel;
  });
}
