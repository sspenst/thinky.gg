import { EnrichedLevel } from '../models/db/level';
import useSWRHelper from './useSWRHelper';

export default function useLevelOfDay() {
  const { data, error, isLoading } = useSWRHelper<EnrichedLevel>('/api/level-of-day');

  return {
    error,
    isLoading,
    levelOfDay: data,
  };
}
