import Level from '../models/db/level';
import useSWRHelper from '../helpers/useSWRHelper';

export default function useLevelBySlug(slug: string) {
  const { data, error, isLoading, mutate } = useSWRHelper<Level>(`/api/level-by-slug/${slug}`);

  return {
    error,
    isLoading,
    level: data,
    mutateLevel: mutate,
  };
}
