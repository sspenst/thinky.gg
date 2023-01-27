import { ReqUser } from '../models/db/user';
import useSWRHelper from './useSWRHelper';

export default function useUser() {
  const { data, error, isLoading, mutate } = useSWRHelper<ReqUser>(
    '/api/user',
    { credentials: 'include' },
    { revalidateIfStale: false },
    { onValidation: false },
  );

  return {
    error,
    isLoading,
    mutateUser: mutate,
    user: data,
  };
}
