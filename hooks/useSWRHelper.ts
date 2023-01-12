import { useContext, useEffect } from 'react';
import useSWR from 'swr';
import { SWRConfiguration } from 'swr/_internal';
import { AppContext } from '../contexts/appContext';

const fetcher = async (args: [RequestInfo, RequestInit | undefined]) => {
  const [input, options] = args;

  if (!input) {
    return undefined;
  }

  const res = await fetch(input, options);

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
  config?: SWRConfiguration,
  progressBarOptions?: ProgressBarOptions,
) {
  const { shouldAttemptAuth, setShouldAttemptAuth } = useContext(AppContext);

  // only avoid using SWR if we have received a 401 and we are making a request with credentials
  const doNotUseSWR = !shouldAttemptAuth && init?.credentials === 'include';

  if (init?.credentials === 'include') {
    config = config || {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config.onError = (err: any) => {
      if (err.status === 401) {
        setShouldAttemptAuth(false);
      }
    };
  }

  const { data, error, isValidating, mutate } = useSWR<T>([doNotUseSWR ? null : input, init], fetcher, config);
  const isLoading = !error && data === undefined && shouldAttemptAuth;
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
