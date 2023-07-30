import { DifficultyLevelComparison } from '../components/profile/profileInsightsSolveTimeComparison';
import { DateAndSum, UserAndStatTs, UserAndSum, UserLevelAndStatTs } from '../contexts/levelContext';
import User from '../models/db/user';
import useSWRHelper from './useSWRHelper';

export enum ProStatsUserType {
  DifficultyLevelsComparisons = 'difficulty-levels-comparisons',
  MostSolvesForUserLevels = 'most-solves-for-user-levels',
  ScoreHistory = 'score-history',
  PlayLogForUserCreatedLevels = 'play-log-for-user-created-levels',
}

export interface ProStatsUser {
  // keyValues is an array of objects
  [ProStatsUserType.ScoreHistory]?: DateAndSum[];
  [ProStatsUserType.DifficultyLevelsComparisons]?: DifficultyLevelComparison[];
  [ProStatsUserType.MostSolvesForUserLevels]?: UserAndSum[];
  [ProStatsUserType.PlayLogForUserCreatedLevels]?: UserLevelAndStatTs[];
}

export default function useProStatsUser(user: User | null, type: ProStatsUserType) {
  const { data, error, isLoading, mutate } = useSWRHelper<ProStatsUser>('/api/user/' + user?._id + '/prostats/' + type, {}, {
    revalidateOnFocus: false,
  }, !user);

  return {
    error,
    isLoading,
    mutateProStatsUser: mutate,
    proStatsUser: data,
  };
}
