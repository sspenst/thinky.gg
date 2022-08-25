import { EnrichedLevel } from '../models/db/level';
import useSWRHelper from './useSWRHelper';

export default function useLatestLevels() {
  const { data, error, isLoading } = useSWRHelper<EnrichedLevel[]>('/api/latest-levels');

  return {
    error,
    isLoading,
    levels: data,
  };
}
