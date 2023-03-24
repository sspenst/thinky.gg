import ProStatsLevelType from '../constants/proStatsLevelType';
import { ProStatsLevel as ProStatsLevel } from '../contexts/levelContext';
import { EnrichedLevel } from '../models/db/level';
import useSWRHelper from './useSWRHelper';

export default function useProStatsLevel(level: EnrichedLevel, type: ProStatsLevelType) {
  const { data, error, isLoading, mutate } = useSWRHelper<ProStatsLevel>('/api/level/' + level._id + '/prostats/' + type);

  return {
    error,
    isLoading,
    mutateProStatsLevel: mutate,
    proStatsLevel: data,
  };
}
