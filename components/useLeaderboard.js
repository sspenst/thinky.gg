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
    users: data,
    isLoading: !error && !data,
    isError: error
  }
}
