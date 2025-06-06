import { NextApiResponse } from 'next';
import { ValidType } from '../../../../helpers/apiWrapper';
import { removeUserAuthProvider } from '../../../../helpers/userAuthHelpers';
import withAuth, { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { AuthProvider } from '../../../../models/db/userAuth';

export default withAuth({
  DELETE: {
    query: {
      provider: ValidType('string')
    }
  }
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  const { provider } = req.query;

  // Validate provider
  if (!Object.values(AuthProvider).includes(provider as AuthProvider)) {
    return res.status(400).json({ error: 'Invalid authentication provider' });
  }

  try {
    const success = await removeUserAuthProvider(req.user._id, provider as AuthProvider);

    if (!success) {
      return res.status(404).json({ error: 'Authentication provider not found' });
    }

    res.status(200).json({ success: true });
  } catch (_error) {
    res.status(500).json({ error: `Failed to disconnect ${provider} account` });
  }
});
