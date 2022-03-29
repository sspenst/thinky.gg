import useSWR from 'swr';

const fetcher = async (input: RequestInfo) => {
  const res = await fetch(input);

  if (!res.ok) {
    const error = await res.json();
    error.status = res.status;
    throw error;
  }

  return res.json();
};

export default function useSWRDynamicHelper<T>(
  input: RequestInfo,
) {
  const { data, error, isValidating, mutate } = useSWR<T>(input, fetcher);
  const isLoading = !error && !data;
  return { data, error, isLoading, isValidating, mutate };
}
