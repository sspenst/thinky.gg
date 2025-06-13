import { NextApiRequest, NextApiResponse } from 'next';
import isLocal from './isLocal';

export default async function initNewrelicErrorLogging(req: NextApiRequest, res: NextApiResponse) {
  // dynamically import newrelic
  const newrelic = process.env.NODE_ENV === 'test' ? undefined : await import('newrelic');
  // overwrite the res.json function to log errors
  const originalJson = res.json;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  res.json = (data: any) => {
    if (data && data.error && process.env.NODE_ENV !== 'test') {
      if (!isLocal()) {
        newrelic?.addCustomAttribute && newrelic.addCustomAttribute('jsonError', data.error);
        newrelic?.addCustomAttribute && newrelic.addCustomAttribute('url', req.url ?? '');
        newrelic?.addCustomAttribute && newrelic.addCustomAttribute('method', req.method ?? '');
      } else {
        console.error('Error response:', data.error, 'URL:', req.url, 'Method:', req.method);
      }
    }

    return originalJson.call(res, data);
  };
}
