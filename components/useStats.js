import useSWR from 'swr';

const fetcher = async url => {
  const res = await fetch(url, { credentials: 'include' });

  if (!res.ok) {
    const error = await res.json();
    error.status = res.status;
    throw error;
  }

  return res.json();
};

export default function useStats() {
  const { data, error, mutate } = useSWR('/api/stats', fetcher, { revalidateIfStale: false });

  return {
    isError: error,
    isLoading: !error && !data,
    mutateStats: mutate,
    stats: data,
  };
}
