import User from '../models/db/user';
import useSWRHelper from './useSWRHelper';

export default function useLeaderboard() {
  const { data, error, isLoading } = useSWRHelper<User[]>(
    '/api/leaderboard',
    undefined,
    undefined,
    { onValidation: true },
  );

  return {
    error,
    isLoading,
    users: data,
  };
}
