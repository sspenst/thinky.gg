import useSWR from 'swr';

const fetcher = async url => {
  const res = await fetch(url);

  if (!res.ok) {
    const error = await res.json();
    error.status = res.status;
    throw error;
  }

  return res.json();
};

export default function useLeaderboard() {
  const { data, error } = useSWR('/api/leaderboard', fetcher);

  return {
    isError: error,
    isLoading: !error && !data,
    users: data,
  };
}
