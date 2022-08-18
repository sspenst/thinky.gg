import { EnrichedLevel } from '../pages/search';
import useSWRHelper from './useSWRHelper';

export default function useLatestLevels() {
  const { data, error, isLoading } = useSWRHelper<EnrichedLevel[]>('/api/latest-levels');

  return {
    error,
    isLoading,
    levels: data,
  };
}
