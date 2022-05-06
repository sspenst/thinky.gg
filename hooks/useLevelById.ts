import Level from '../models/db/level';
import useSWRHelper from '../helpers/useSWRHelper';

export default function useLevelById(id: string | string[] | undefined) {
  const { data, error, isLoading, mutate } = useSWRHelper<Level>(id ? `/api/level-by-id/${id}` : null);

  return {
    error,
    isLoading,
    level: data,
    mutateLevel: mutate,
  };
}
