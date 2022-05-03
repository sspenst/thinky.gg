import User from '../models/db/user';
import useSWRHelper from '../helpers/useSWRHelper';

export default function useUniverses() {
  const { data, error, isLoading, mutate } = useSWRHelper<User[]>('/api/universes');

  return {
    error,
    isLoading,
    mutateUniverses: mutate,
    universes: data,
  };
}
