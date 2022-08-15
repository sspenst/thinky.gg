import Statistics from '../models/statistics';
import useSWRHelper from './useSWRHelper';

export default function useStatistics() {
  const { data, error, isLoading } = useSWRHelper<Statistics>(
    '/api/statistics',
    undefined,
    undefined,
    { onValidation: true },
  );

  return {
    error,
    isLoading,
    statistics: data,
  };
}
