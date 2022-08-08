import { useContext, useEffect } from 'react';
import useSWR, { BareFetcher } from 'swr';
import { PublicConfiguration } from 'swr/dist/types';
import { AppContext } from '../contexts/appContext';
import { PageContext } from '../contexts/pageContext';

const fetcher = async (input: RequestInfo, init?: RequestInit) => {
  if (!input) {
    return undefined;
  }

  const res = await fetch(input, init);

  if (!res.ok) {
    const error = await res.json();

    error.status = res.status;
    throw error;
  }

  return res.json();
};

interface ProgressBarOptions {
  onValidation: boolean;
}

export default function useSWRHelper<T>(
  input: RequestInfo | null,
  init?: RequestInit,
  config?: Partial<PublicConfiguration<T, unknown, BareFetcher<T>>>,
  progressBarOptions?: ProgressBarOptions,
) {
  const { shouldAttemptSWR, setShouldAttemptSWR } = useContext(PageContext);

  config = config || {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config.onError = (err: any) => {
    if (err.status === 401) {
      setShouldAttemptSWR(false);
      window.sessionStorage.setItem('shouldAttemptSWR', 'false');
    }
  };

  const { data, error, isValidating, mutate } = useSWR<T>([shouldAttemptSWR ? input : null, init], fetcher, config);
  const isLoading = !error && !data && shouldAttemptSWR;
  const { setIsLoading } = useContext(AppContext);

  useEffect(() => {
    if (!progressBarOptions) {
      return;
    }

    // TODO: when you log in the stats should be loading but they are validating?
    // do i need to check !data && isValidating?
    // am i mutating incorrectly to delete the SWR?
    setIsLoading(isLoading || (progressBarOptions.onValidation && isValidating));
  }, [isLoading, isValidating, progressBarOptions, setIsLoading]);

  return { data, error, isLoading, isValidating, mutate };
}
