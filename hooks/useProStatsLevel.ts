import { ProStatsLevel } from '../contexts/levelContext';
import { EnrichedLevel } from '../models/db/level';
import useSWRHelper from './useSWRHelper';

export default function useProStatsLevel(level: EnrichedLevel) {
  const { data, error, isLoading, mutate } = useSWRHelper<ProStatsLevel>(`/api/level/${level?._id.toString()}/prostats`);

  return {
    error,
    isLoading,
    mutateProStatsLevel: mutate,
    proStatsLevel: data,
  };
}
