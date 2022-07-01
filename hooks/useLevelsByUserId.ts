import Level from '../models/db/level';
import useSWRHelper from './useSWRHelper';

export default function useLevelsByUserId(id: string | string[] | undefined) {
  const { data, error, isLoading, mutate } = useSWRHelper<Level[]>(id ? `/api/levels-by-user-id/${id}` : null);

  return {
    error,
    isLoading,
    levels: data,
    mutateLevelsByUserId: mutate,
  };
}
