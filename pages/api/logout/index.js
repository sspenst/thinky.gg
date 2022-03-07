import clearTokenCookie from '../../../lib/clearTokenCookie';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  res.setHeader('Set-Cookie', clearTokenCookie())
    .status(200).json({ success: true });
}
