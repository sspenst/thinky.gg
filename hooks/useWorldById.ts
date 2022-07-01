import World from '../models/db/world';
import useSWRHelper from './useSWRHelper';

export default function useWorldById(id: string | string[] | undefined) {
  const { data, error, isLoading, mutate } = useSWRHelper<World>(id ? `/api/world-by-id/${id}` : null);

  return {
    error,
    isLoading,
    mutateWorld: mutate,
    world: data,
  };
}
