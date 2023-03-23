import { DateAndSum, ProStatsLevel as ProStatsLevel } from '../contexts/levelContext';
import { EnrichedLevel } from '../models/db/level';
import User from '../models/db/user';
import useSWRHelper from './useSWRHelper';

export enum ProStatsUserType {
  ScoreHistory = 'score-history',
  DifficultyLevelsComparisons = 'difficulty-levels-comparisons',

}

export interface ProStatsUser {
  // keyValues is an array of objects
  [ProStatsUserType.ScoreHistory]?: DateAndSum[];
  [ProStatsUserType.DifficultyLevelsComparisons]?: DifficultyLevelComparison[];
}

export interface DifficultyLevelComparison {
  _id: string;
  name: string;
  difficulty: number;
  averageDuration: number;
  diff?: number;
}

export default function useProStatsUser(user: User | null, type: ProStatsUserType) {
  const { data, error, isLoading, mutate } = useSWRHelper<ProStatsUser>('/api/user/' + user?._id + '/prostats/' + type, {

  }, {
    revalidateOnFocus: false,
  }, !user);

  return {
    error,
    isLoading,
    data: data,
    mutateProStats: mutate,
  };
}
