import User from '../models/data/pathology/user';
import useSWRHelper from '../helpers/useSWRHelper';

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
