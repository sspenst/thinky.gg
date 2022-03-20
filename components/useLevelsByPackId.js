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

export default function useLevelsByPackId(id) {
  const { data, error } = useSWR(`/api/levelsByPackId/${id}`, fetcher);

  return {
    levels: data,
    isLoading: !error && !data,
    isError: error
  }
}
