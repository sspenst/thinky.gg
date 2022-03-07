import withAuth from '../../../lib/withAuth';

async function handler(req, res) {
  res.status(200).json({ success: true });
}

export default withAuth(handler);
