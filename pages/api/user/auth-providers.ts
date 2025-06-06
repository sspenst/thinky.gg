import { NextApiResponse } from 'next';
import { getUserAuthProvidersForSettings } from '../../../helpers/userAuthHelpers';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';

export default withAuth({
  GET: {}
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  try {
    const authProviders = await getUserAuthProvidersForSettings(req.user._id);

    res.status(200).json({ authProviders });
  } catch (error) {
    console.error('Error fetching auth providers:', error);
    res.status(500).json({ error: 'Failed to fetch authentication providers' });
  }
});
