/* istanbul ignore file */

import { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper from '../../../helpers/apiWrapper';

export default apiWrapper({ GET: {} }, async (req: NextApiRequest, res: NextApiResponse) => {
  const { statusCode } = req.query;

  if (statusCode as string === '500') {
    throw new Error('500 error');
  }

  return res.status(parseInt(statusCode as string) || 200).json({ status: 'OK' });
});
