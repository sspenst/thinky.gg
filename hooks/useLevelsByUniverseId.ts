import Level from '../models/db/level';
import useSWRHelper from '../helpers/useSWRHelper';

export default function useLevelsByUniverseId(id: string | string[] | undefined) {
  const { data, error, isLoading, mutate } = useSWRHelper<Level[]>(id ? `/api/levels-by-universe-id/${id}` : null);

  return {
    error,
    isLoading,
    levels: data,
    mutateLevelsByUniverseId: mutate,
  };
}
