import { EnrichedLevel } from '../models/db/level';
import useSWRHelper from './useSWRHelper';

export default function useLevelOfDay() {
  const { data, error, isLoading } = useSWRHelper<EnrichedLevel>('/api/level-of-day', undefined, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  return {
    error,
    isLoading,
    levelOfDay: data,
  };
}
