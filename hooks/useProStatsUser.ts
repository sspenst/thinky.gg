import { LevelWithRecordHistory } from '@root/helpers/getRecordsByUserId';
import { DifficultyLevelComparison } from '../components/profile/profileInsightsSolveTimeComparison';
import { DateAndSum, UserAndSum, UserLevelAndStatTs } from '../contexts/levelContext';
import User from '../models/db/user';
import useSWRHelper from './useSWRHelper';
import { TimeFilter } from '../components/profile/profileInsights';

export enum ProStatsUserType {
  DifficultyLevelsComparisons = 'difficulty-levels-comparisons',
  MostSolvesForUserLevels = 'most-solves-for-user-levels',
  ScoreHistory = 'score-history',
  PlayLogForUserCreatedLevels = 'play-log-for-user-created-levels',
  Records = 'records',
}

export interface ProStatsUser {
  // keyValues is an array of objects
  [ProStatsUserType.ScoreHistory]?: DateAndSum[];
  [ProStatsUserType.DifficultyLevelsComparisons]?: DifficultyLevelComparison[];
  [ProStatsUserType.MostSolvesForUserLevels]?: UserAndSum[];
  [ProStatsUserType.PlayLogForUserCreatedLevels]?: UserLevelAndStatTs[];
  [ProStatsUserType.Records]?: LevelWithRecordHistory[];
}

export default function useProStatsUser(user: User | null, type: ProStatsUserType, timeFilter: TimeFilter = TimeFilter.ALL) {
  const timeParam = timeFilter !== TimeFilter.ALL ? `?timeFilter=${timeFilter}` : '';
  const { data, error, isLoading, mutate } = useSWRHelper<ProStatsUser>('/api/user/' + user?._id + '/prostats/' + type + timeParam, {}, {
    revalidateOnFocus: false,
  }, !user);

  return {
    error,
    isLoading,
    mutateProStatsUser: mutate,
    proStatsUser: data,
  };
}
