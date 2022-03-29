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

export default function useLevel(id) {
  const { data, error, mutate } = useSWR(`/api/level/${id}`, fetcher);

  return {
    isError: error,
    isLoading: !error && !data,
    level: data,
    mutateLevel: mutate,
  };
}
