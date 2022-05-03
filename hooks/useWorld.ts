import World from '../models/db/world';
import useSWRHelper from '../helpers/useSWRHelper';

export default function useWorld(id: string | string[] | undefined) {
  const { data, error, isLoading, mutate } = useSWRHelper<World>(`/api/world/${id}`);

  return {
    error,
    isLoading,
    mutateWorld: mutate,
    world: data,
  };
}
