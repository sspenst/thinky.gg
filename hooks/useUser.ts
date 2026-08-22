import { ReqUser } from '../models/db/user';
import useSWRHelper from './useSWRHelper';

export default function useUser() {
  const { data, error, isLoading, mutate } = useSWRHelper<ReqUser>(
    '/api/user',
    { credentials: 'include' },
    {
      revalidateIfStale: false,
      revalidateOnReconnect: true,
      revalidateOnFocus: false,
      // A 401 is the expected response for an anonymous visitor. Retrying it adds
      // several unnecessary requests to every signed-out session.
      shouldRetryOnError: error => error?.status !== 401,
    },
  );

  return {
    error,
    isLoading,
    mutateUser: mutate,
    user: data,
  };
}
