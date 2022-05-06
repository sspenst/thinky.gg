import Level from '../models/db/level';
import useSWRHelper from '../helpers/useSWRHelper';

export default function useLevelById(id: string | string[] | undefined) {
  const { data, error, isLoading, mutate } = useSWRHelper<Level>(`/api/level-by-id/${id}`);

  return {
    error,
    isLoading,
    level: data,
    mutateLevel: mutate,
  };
}
