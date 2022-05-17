import { ReviewModel, StatModel, UserModel } from '../../../models/mongoose';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import type { NextApiResponse } from 'next';
import User from '../../../models/db/user';
import bcrypt from 'bcrypt';
import clearTokenCookie from '../../../lib/clearTokenCookie';
import dbConnect from '../../../lib/dbConnect';
import revalidateUniverse from '../../../helpers/revalidateUniverse';

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'GET') {
    await dbConnect();
    const user = await UserModel.findById<User>(req.userId, '-password');

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    res.status(200).json(user);
  } else if (req.method === 'PUT') {
    await dbConnect();

    const {
      currentPassword,
      email,
      name,
      password,
    } = req.body;

    if (password) {
      const user = await UserModel.findById(req.userId);

      if (!await bcrypt.compare(currentPassword, user.password)) {
        return res.status(401).json({
          error: 'Incorrect email or password',
        });
      }

      user.password = password;
      await user.save();
      res.status(200).json({ updated: true });
    } else {
      const setObj: {[k: string]: string} = {};

      if (email) {
        setObj['email'] = email;
      }

      if (name) {
        setObj['name'] = name;
      }

      try {
        await UserModel.updateOne({ _id: req.userId }, { $set: setObj });
      } catch {
        return res.status(400).json({ updated: false });
      }

      if (name) {
        await revalidateUniverse(req, res);
      } else {
        return res.status(200).json({ updated: true });
      }
    }
  } else if (req.method === 'DELETE') {
    await dbConnect();

    await Promise.all([
      ReviewModel.deleteMany({ userId: req.userId }),
      StatModel.deleteMany({ userId: req.userId }),
      UserModel.deleteOne({ _id: req.userId }),
    ]);

    res.setHeader('Set-Cookie', clearTokenCookie(req.headers.host));

    await revalidateUniverse(req, res);
  } else {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }
});
