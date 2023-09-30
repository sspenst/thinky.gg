import { createContext } from 'react';
import { KeyedMutator } from 'swr';
import ProStatsLevelType from '../constants/proStatsLevelType';
import { EnrichedLevel } from '../models/db/level';
import Record from '../models/db/record';
import Review from '../models/db/review';
import User from '../models/db/user';

export interface ProStatsLevel {
  [ProStatsLevelType.CommunityPlayAttemptsData]?: CountAndSum;
  [ProStatsLevelType.CommunityStepData]?: ProStatsCommunityStepData[];
  [ProStatsLevelType.PlayAttemptsOverTime]?: DateAndSum[];
}

export interface DateAndSum {
  date: string;
  sum: number;
}

export interface UserAndSum {
  sum: number;
  user: User;
}

export interface CountAndSum {
  count: number;
  sum: number;
}

export interface UserAndStatTs {
  statTs: number;
  user: User | null;
}

export interface UserLevelAndStatTs {
  levelId: EnrichedLevel;
  statTs: number;
  user: User | null;
}

export interface ProStatsCommunityStepData {
  count: number;
  moves: number;
  users: UserAndStatTs[];
}

interface LevelContextInterface {
  getReviews: () => void;
  inCampaign: boolean; // true means you are playing an unbeaten level in the campaign
  level: EnrichedLevel;
  mutateLevel: () => void;
  mutateProStatsLevel: KeyedMutator<ProStatsLevel>;
  proStatsLevel?: ProStatsLevel;
  records: Record[] | undefined;
  reviews: Review[] | undefined;
  setSidebarIndex: React.Dispatch<React.SetStateAction<number>>;
  sidebarIndex: number;
}

export const LevelContext = createContext<LevelContextInterface | null>(null);
