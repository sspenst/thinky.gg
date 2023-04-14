import Role from '@root/constants/role';
import getEmailConfirmationToken from '@root/helpers/getEmailConfirmationToken';
import sendEmailConfirmationEmail from '@root/lib/sendEmailConfirmToken';
import UserConfig from '@root/models/db/userConfig';
import type { NextApiResponse } from 'next';
import { ValidType } from '../../../helpers/apiWrapper';
import dbConnect from '../../../lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { UserConfigModel, UserModel } from '../../../models/mongoose';

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

  if (!req.user.roles.includes(Role.GUEST)) {
    return res.status(401).json({
      error: 'Unauthorized: Not a guest account',
    });
  }

  const {
    email,
    name,
    password,
  } = req.body;

  const user = await UserModel.findById(req.userId, '+password', { lean: false });

  user.email = email.trim();
  user.name = name.trim();
  user.password = password;
  user.roles = user.roles.filter((role: Role) => role !== Role.GUEST);

  await user.save();

  const userConfig = await UserConfigModel.findOneAndUpdate({ userId: req.userId }, {
    $set: {
      emailConfirmationToken: getEmailConfirmationToken(),
      emailConfirmed: false,
    }
  }, {
    new: true,
    projection: { emailConfirmationToken: 1, },
  });

  await sendEmailConfirmationEmail(req, user, userConfig as UserConfig);

  return res.status(200).json({ updated: true });
});
