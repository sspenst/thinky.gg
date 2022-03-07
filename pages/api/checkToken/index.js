import withAuth from '../../../lib/withAuth';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  res.status(200).json({ success: true });
}

export default withAuth(handler);
