import Level from '../models/db/level';
import { EnrichedLevelServer } from '../pages/search';
import useSWRHelper from './useSWRHelper';

export default function useLevelBySlug(slug: string) {
  const { data, error, isLoading, mutate } = useSWRHelper<EnrichedLevelServer>(`/api/level-by-slug/${slug}`);

  return {
    error,
    isLoading,
    level: data,
    mutateLevel: mutate,
  };
}
