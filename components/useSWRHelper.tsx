import { useContext, useEffect } from 'react';
import useSWR, { BareFetcher } from 'swr';
import { AppContext } from './appContext';
import { PublicConfiguration } from 'swr/dist/types';

const fetcher = async (input: RequestInfo, init?: RequestInit) => {
  const res = await fetch(input, init);

  if (!res.ok) {
    const error = await res.json();
    error.status = res.status;
    throw error;
  }

  return res.json();
};

export default function useSWRHelper<T>(
  input: RequestInfo,
  init?: RequestInit,
  config?: Partial<PublicConfiguration<T, unknown, BareFetcher<T>>>,
  useProgressBar = true,
) {
  const { data, error, isValidating, mutate } = useSWR<T>([input, init], fetcher, config);
  const isLoading = !error && !data;
  const { setIsLoading } = useContext(AppContext);

  useEffect(() => {
    if (useProgressBar) {
      setIsLoading(isLoading || isValidating);
    }
  }, [isLoading, isValidating, setIsLoading, useProgressBar]);

  return { data, error, isLoading, isValidating, mutate };
}
