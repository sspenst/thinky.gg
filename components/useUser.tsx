import User from '../models/data/pathology/user';
import useSWRHelper from './useSWRHelper';

export default function useUser() {
  const { data, error, isLoading, mutate } = useSWRHelper<User>(
    '/api/user',
    { credentials: 'include' },
    { revalidateIfStale: false }
  );

  return {
    error,
    isLoading,
    mutateUser: mutate,
    user: data,
  };
}
