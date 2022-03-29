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

export default function useUser() {
  const { data, error, mutate } = useSWR('/api/user', fetcher, { revalidateIfStale: false });

  return {
    isError: error,
    isLoading: !error && !data,
    mutateUser: mutate,
    user: data,
  };
}
