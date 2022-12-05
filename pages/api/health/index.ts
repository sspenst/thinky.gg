/* istanbul ignore file */

import { NextApiRequest, NextApiResponse } from 'next';
import { Socket } from 'socket.io';
import apiWrapper from '../../../helpers/apiWrapper';

export default apiWrapper({ GET: {} }, async (req: NextApiRequest, res: NextApiResponse) => {
  const { statusCode } = req.query;

  if (process.env.HEALTH_CHECK_SECRET && process.env.HEALTH_CHECK_SECRET !== req.query['secret']) {
    return res.status(401).json({
      error: 'Invalid secret',
    });
  }

  if (statusCode as string === '500') {
    throw new Error('500 error');
  }

  const sockets: { [url: string]: boolean } = {};

  for (const url in global.appSocketToWebSocketServer) {
    sockets[url] = global.appSocketToWebSocketServer[url].connected;
  }

  return res.status(parseInt(statusCode as string) || 200).json(
    {
      status: 'OK',
      socketStates: sockets,
    },

  );
});
