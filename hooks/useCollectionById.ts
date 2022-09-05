import Collection from '../models/db/collection';
import useSWRHelper from './useSWRHelper';

export default function useCollectionById(id: string | string[] | undefined) {
  const { data, error, isLoading, mutate } = useSWRHelper<Collection>(id ? `/api/collection-by-id/${id}` : null);

  return {
    collection: data,
    error,
    isLoading,
    mutateCollection: mutate,
  };
}
