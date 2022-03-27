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
  const { data, error } = useSWR('/api/stats', fetcher);

  return {
    stats: data,
    isLoading: !error && !data,
    isError: error
  }
}
