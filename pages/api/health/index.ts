/* istanbul ignore file */

import { NextApiRequest, NextApiResponse } from 'next';
import { Socket } from 'socket.io';
import apiWrapper from '../../../helpers/apiWrapper';

export default apiWrapper({ GET: {} }, async (req: NextApiRequest, res: NextApiResponse) => {
  const { secret } = req.query;

  if (process.env.HEALTH_CHECK_SECRET && process.env.HEALTH_CHECK_SECRET !== secret) {
    return res.status(401).json({
      error: 'Invalid secret',
    });
  }

  const components = [];
  let anyBad = false;
  let status = 200;

  for (const url in global.appSocketToWebSocketServer) {
    const connected = global.appSocketToWebSocketServer[url].connected;

    components.push({
      componentId: url,
      componentType: 'websocket',
      componentValue: connected
    });

    if (!connected) {
      anyBad = true;
      status = 503;
    }
  }

  return res.status(status).json(
    {
      host: process.env.HOSTNAME || 'Unknown host',
      status: anyBad ? 'fail' : 'pass',
      details: components
    },

  );
});
