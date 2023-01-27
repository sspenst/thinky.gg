/* istanbul ignore file */

import { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper from '../../../helpers/apiWrapper';

export default apiWrapper({ GET: {} }, async (req: NextApiRequest, res: NextApiResponse) => {
  const { secret } = req.query;

  if (process.env.HEALTH_CHECK_SECRET && process.env.HEALTH_CHECK_SECRET !== secret) {
    return res.status(401).json({
      error: 'Invalid secret',
    });
  }

  const mongoReadyState = global.db.conn?.connection.readyState;
  const status = mongoReadyState !== 1 ? 'fail' : 'pass';

  return res.status(status === 'fail' ? 503 : 200).json(
    {
      host: process.env.HOSTNAME || 'Unknown host',
      status: status,
      details: {
        mongoConnection: mongoReadyState,
      }
    },

  );
});
