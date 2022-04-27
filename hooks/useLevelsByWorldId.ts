import Level from '../models/db/level';
import useSWRHelper from '../helpers/useSWRHelper';

export default function useLevelsByWorldId(id: string | string[] | undefined) {
  const { data, error, isLoading, mutate } = useSWRHelper<Level[]>(`/api/levels-by-world-id/${id}`);

  return {
    error,
    isLoading,
    levels: data,
    mutateLevelsByWorldId: mutate,
  };
}
