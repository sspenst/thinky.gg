import { DateAndSum, UserAndSum } from '../contexts/levelContext';
import User from '../models/db/user';
import useSWRHelper from './useSWRHelper';

export enum ProStatsUserType {
  ScoreHistory = 'score-history',
  DifficultyLevelsComparisons = 'difficulty-levels-comparisons',
  MostSolvesForUserLevels = 'most-solves-for-user-levels',

}

export interface ProStatsUser {
  // keyValues is an array of objects
  [ProStatsUserType.ScoreHistory]?: DateAndSum[];
  [ProStatsUserType.DifficultyLevelsComparisons]?: DifficultyLevelComparison[];
  [ProStatsUserType.MostSolvesForUserLevels]?: UserAndSum[];
}

export interface DifficultyLevelComparison {
  _id: string;
  name: string;
  difficulty: number;
  difficultyAdjusted: number;
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
