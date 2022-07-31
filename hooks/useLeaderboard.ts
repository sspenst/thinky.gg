import { UserWithCount } from '../components/reviewerLeaderboardTable';
import User from '../models/db/user';
import useSWRHelper from './useSWRHelper';

export default function useLeaderboard() {
  const { data, error, isLoading } = useSWRHelper<{users:User[], reviewers:UserWithCount[]}>(
    '/api/leaderboard',
    undefined,
    undefined,
    { onValidation: true },
  );

  return {
    error,
    isLoading,
    users: data?.users,
    reviewers: data?.reviewers
  };
}
