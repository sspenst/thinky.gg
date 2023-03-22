import { ProStats } from '../contexts/levelContext';
import { EnrichedLevel } from '../models/db/level';
import useSWRHelper from './useSWRHelper';

export enum ProStatsType {
  CommunityStepData = 'community-step-data',
  PlayAttemptsOverTime = 'play-attempts-over-time',
}

export default function useProStats(level: EnrichedLevel, type: ProStatsType) {
  const { data, error, isLoading, mutate } = useSWRHelper<ProStats>('/api/level/' + level._id + '/prostats/' + type);

  return {
    error,
    isLoading,
    data: data,
    mutateProStats: mutate,
  };
}
