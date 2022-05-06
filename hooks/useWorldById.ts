import World from '../models/db/world';
import useSWRHelper from '../helpers/useSWRHelper';

export default function useWorldById(id: string | string[] | undefined) {
  const { data, error, isLoading, mutate } = useSWRHelper<World>(`/api/world-by-id/${id}`);

  return {
    error,
    isLoading,
    mutateWorld: mutate,
    world: data,
  };
}
