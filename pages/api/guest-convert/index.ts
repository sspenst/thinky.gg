import Discord from '@root/constants/discord';
import Role from '@root/constants/role';
import queueDiscordWebhook from '@root/helpers/discordWebhook';
import getEmailConfirmationToken from '@root/helpers/getEmailConfirmationToken';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import getProfileSlug from '@root/helpers/getProfileSlug';
import isGuest from '@root/helpers/isGuest';
import sendEmailConfirmationEmail from '@root/lib/sendEmailConfirmationEmail';
import type { NextApiResponse } from 'next';
import { ValidType } from '../../../helpers/apiWrapper';
import dbConnect from '../../../lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { UserModel } from '../../../models/mongoose';

export default withAuth({
  PUT: {
    body: {
      email: ValidType('string', true),
      name: ValidType('string', true),
      password: ValidType('string', true),
    }
  },
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  await dbConnect();

  if (!isGuest(req.user)) {
    return res.status(401).json({
      error: 'Unauthorized: Not a guest account',
    });
  }

  const {
    email,
    name,
    password,
  } = req.body;

  const user = await UserModel.findById(req.userId, '+password');
  const trimmedName = name.trim();

  user.email = email.trim();
  user.emailConfirmationToken = getEmailConfirmationToken();
  user.emailConfirmed = false;
  user.name = trimmedName;
  user.password = password;
  user.roles = user.roles.filter((role: Role) => role !== Role.GUEST);
  await user.save();
  const game = getGameFromId(req.gameId);

  await Promise.all([
    sendEmailConfirmationEmail(req, user),
    queueDiscordWebhook(Discord.NewUsers, `**${game.displayName}** - **${trimmedName}** just converted from a guest account! Welcome them on their [profile](${req.headers.origin}${getProfileSlug(user)})!`),
  ]);

  return res.status(200).json({ updated: true });
});
