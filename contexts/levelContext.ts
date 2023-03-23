import { createContext } from 'react';
import { ProStatsLevelType } from '../hooks/useProStatsLevel';
import { EnrichedLevel } from '../models/db/level';
import Record from '../models/db/record';
import Review from '../models/db/review';
import Stat from '../models/db/stat';
import User from '../models/db/user';

export interface ProStatsLevel {
  // keyValues is an array of objects
  [ProStatsLevelType.PlayAttemptsOverTime]?: DateAndSum[];
  [ProStatsLevelType.CommunityStepData]?: ProStatsCommunityStepData[];
}
export interface DateAndSum {
    sum: number,
    date: string
}
export interface ProStatsCommunityStepData {
    count: number,
    moves: number,
    users: User[]
}

interface LevelContextInterface {
  completions: Stat[] | undefined;
  getCompletions: (all: boolean) => void;
  getReviews: () => void;
  inCampaign: boolean; // true means you are playing an unbeaten level in the campaign
  level: EnrichedLevel;
  mutateLevel: () => void;
  records: Record[] | undefined;
  reviews: Review[] | undefined;
  prostats?: ProStatsLevel;
}

export const LevelContext = createContext<LevelContextInterface | null>(null);
