import { NextApiResponse } from 'next';
import PrivateTagType from '../../../../constants/privateTagType';
import { ValidType } from '../../../../helpers/apiWrapper';
import { removeUserAuthProvider } from '../../../../helpers/userAuthHelpers';
import withAuth, { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import UserAuth, { AuthProvider } from '../../../../models/db/userAuth';
import { UserAuthModel, UserModel } from '../../../../models/mongoose';

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
    const authProviders = await UserAuthModel.find({ userId: req.user._id }).lean<UserAuth[]>();
    const currentProvider = authProviders.find(p => p.provider === provider);

    if (!currentProvider) {
      return res.status(404).json({ error: 'Authentication provider not found' });
    }

    // If this is the last OAuth provider, check if user has set a password
    const remainingProviders = authProviders.filter(p => p.provider !== provider);

    if (remainingProviders.length === 0) {
      // Check if user has set a password they know by explicitly querying privateTags
      const userWithTags = await UserModel.findById(req.user._id, '+privateTags');
      const hasSetPassword = userWithTags?.privateTags?.includes(PrivateTagType.HAS_PASSWORD) || false;

      if (!hasSetPassword) {
        return res.status(400).json({
          error: 'Cannot disconnect your last authentication method. Please set up password authentication first by requesting a password reset email in the Security section.',
          requiresPassword: true
        });
      }
    }

    const success = await removeUserAuthProvider(req.user._id, provider as AuthProvider);

    if (!success) {
      return res.status(404).json({ error: 'Authentication provider not found' });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error disconnecting provider:', error);
    res.status(500).json({ error: `Failed to disconnect ${provider} account` });
  }
});
