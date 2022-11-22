import { NextApiRequest, NextApiResponse } from 'next/types';
import NextHttpProxyMiddleware from 'next-http-proxy-middleware';
import httpProxyMiddleware from 'next-http-proxy-middleware';

const http = async (req: NextApiRequest, res: NextApiResponse) => {
  return httpProxyMiddleware(req, res, {
    target: 'http://localhost:3001',
    ws: true,
    changeOrigin: true,
    pathRewrite: [
      {
        patternStr: '^/api/socket',
        replaceStr: '',
      },
    ],
  });
};

export default http;
