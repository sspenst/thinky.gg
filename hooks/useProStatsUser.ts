import { LevelWithRecordHistory } from '@root/helpers/getRecordsByUserId';
import { TimeFilter } from '../components/profile/profileInsights';
import { DifficultyLevelComparison } from '../components/profile/profileInsightsSolveTimeComparison';
import { DateAndSum, UserAndSum, UserLevelAndStatTs } from '../contexts/levelContext';
import User from '../models/db/user';
import useSWRHelper from './useSWRHelper';

export enum ProStatsUserType {
  DifficultyLevelsComparisons = 'difficulty-levels-comparisons',
  MostSolvesForUserLevels = 'most-solves-for-user-levels',
  ScoreHistory = 'score-history',
  PlayLogForUserCreatedLevels = 'play-log-for-user-created-levels',
  Records = 'records',
  FollowerActivityPatterns = 'follower-activity-patterns',
}

export interface ProStatsUser {
  // keyValues is an array of objects
  [ProStatsUserType.ScoreHistory]?: DateAndSum[];
  [ProStatsUserType.DifficultyLevelsComparisons]?: DifficultyLevelComparison[];
  [ProStatsUserType.MostSolvesForUserLevels]?: UserAndSum[];
  [ProStatsUserType.PlayLogForUserCreatedLevels]?: {
    creatorLevels: Array<{
      _id: string;
      name: string;
      slug: string;
      data: string;
      calc_difficulty_estimate: number;
      calc_stats_completed_count: number;
      calc_playattempts_unique_users: string[];
    }>;
    engagementMetrics: {
      totalSolves: number;
      uniquePlayersCount: number;
      uniquePlayerIds: string[];
      solvesByUser: Array<{ userId: string; levelId: string }>;
    };
    topSolver: {
      solveCount: number;
      user: User;
    } | null;
    popularityTrends: Array<{
      date: Date;
      totalSolves: number;
      uniquePlayers: number;
    }>;
    levelPerformance: Array<{
      name: string;
      slug: string;
      solveCount: number;
      uniquePlayers: number;
      calc_stats_completed_count: number;
    }>;
    playLog: UserLevelAndStatTs[]; // Limited sample for backward compatibility
  };
  [ProStatsUserType.Records]?: LevelWithRecordHistory[];
  [ProStatsUserType.FollowerActivityPatterns]?: {
    followerCount: number;
    activeFollowerCount: number;
    hasDiscordConnected: boolean;
    heatmapData: Array<{ dayOfWeek: number; hour: number; activityCount: number; activeFollowers: number }>;
    hourlyActivity: Array<{ hour: number; activityCount: number; activeFollowers: number }>;
    dailyActivity: Array<{ dayOfWeek: number; activityCount: number; activeFollowers: number }>;
    recommendations: {
      bestHour: number;
      bestDay: number;
      bestTimeLabel: string;
      bestDayLabel: string;
      activityScore: number;
    };
  };
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
