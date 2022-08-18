import { EnrichedLevel } from '../pages/search';
import useSWRHelper from './useSWRHelper';

export default function useLevelBySlug(slug: string) {
  const { data, error, isLoading, mutate } = useSWRHelper<EnrichedLevel>(`/api/level-by-slug/${slug}`);

  return {
    error,
    isLoading,
    level: data,
    mutateLevel: mutate,
  };
}
