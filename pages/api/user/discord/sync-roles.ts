import { NextApiResponse } from 'next';
import isPro from '../../../../helpers/isPro';
import { updateDiscordProRole } from '../../../../helpers/syncDiscordProRole';
import withAuth, { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { AuthProvider } from '../../../../models/db/userAuth';
import { UserAuthModel } from '../../../../models/mongoose';

export default withAuth({
  POST: {}
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  // Check if user has Discord connected
  const discordAuth = await UserAuthModel.findOne({
    userId: req.user._id,
    provider: AuthProvider.DISCORD,
  });

  if (!discordAuth) {
    return res.status(400).json({
      success: false,
      message: 'Discord account not connected',
    });
  }

  // Sync the Discord Pro role
  await updateDiscordProRole(discordAuth.providerId, isPro(req.user));

  return res.status(200).json({
    success: true,
    message: 'Discord roles synced successfully!',
  });
});
