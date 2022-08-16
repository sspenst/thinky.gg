import Level from '../models/db/level';
import { EnrichedLevelServer } from '../pages/search';
import useSWRHelper from './useSWRHelper';

export default function useLatestLevels() {
  const { data, error, isLoading } = useSWRHelper<EnrichedLevelServer[]>('/api/latest-levels');

  return {
    error,
    isLoading,
    levels: data,
  };
}
