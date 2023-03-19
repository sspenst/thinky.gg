import { ProStats } from '../contexts/levelContext';
import { EnrichedLevel } from '../models/db/level';
import useSWRHelper from './useSWRHelper';

export default function useProStats(level: EnrichedLevel) {
  const { data, error, isLoading, mutate } = useSWRHelper<ProStats>(`/api/prostats/${level._id}`);

  return {
    error,
    isLoading,
    prostats: data,
    mutateProStats: mutate,
  };
}
