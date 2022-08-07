import bcrypt from 'bcrypt';
import type { NextApiResponse } from 'next';
import revalidateUniverse from '../../../helpers/revalidateUniverse';
import { cleanUser } from '../../../lib/cleanUser';
import clearTokenCookie from '../../../lib/clearTokenCookie';
import dbConnect from '../../../lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { ReviewModel, StatModel, UserConfigModel, UserModel } from '../../../models/mongoose';

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'GET') {
    await dbConnect();

    if (req.userId === null) {
      res.status(401).end();

      return;
    }

    // remove the key password from req.current_user
    req.user = {
      ...req.user,
      password: undefined,
    };

    cleanUser(req.user);

    return res.status(200).json(req.user);
  } else if (req.method === 'PUT') {
    await dbConnect();

    const {
      currentPassword,
      email,
      hideStatus,
      name,
      password,
    } = req.body;

    if (password) {
      const user = await UserModel.findById(req.userId, {}, { lean: false });

      if (!await bcrypt.compare(currentPassword, user.password)) {
        return res.status(401).json({
          error: 'Incorrect email or password',
        });
      }

      user.password = password;
      await user.save();

      return res.status(200).json({ updated: true });
    } else {
      const setObj: {[k: string]: string} = {};

      if (hideStatus !== undefined) {
        setObj['hideStatus'] = hideStatus;
      }

      if (email) {
        setObj['email'] = email.trim();
      }

      if (name) {
        setObj['name'] = name.trim().toLowerCase();
      }

      try {
        await UserModel.updateOne({ _id: req.userId }, { $set: setObj });
      } catch (err){
        return res.status(400).json({ updated: false });
      }

      if (name) {
        try {
          const revalidateRes = await revalidateUniverse(req);

          if (revalidateRes.status !== 200) {
            throw await revalidateRes.text();
          } else {
            return res.status(200).json({ updated: true });
          }
        } catch (err) {
          console.trace(err);

          return res.status(500).json({
            error: 'Error revalidating api/user ' + err,
          });
        }
      } else {
        return res.status(200).json({ updated: true });
      }
    }
  } else if (req.method === 'DELETE') {
    await dbConnect();

    await Promise.all([
      ReviewModel.deleteMany({ userId: req.userId }),
      StatModel.deleteMany({ userId: req.userId }),
      UserConfigModel.deleteOne({ userId: req.userId }),
      UserModel.deleteOne({ _id: req.userId }),
    ]);

    res.setHeader('Set-Cookie', clearTokenCookie(req.headers?.host));

    try {
      const revalidateRes = await revalidateUniverse(req);

      if (revalidateRes.status !== 200) {
        throw await revalidateRes.text();
      } else {
        return res.status(200).json({ updated: true });
      }
    } catch (err) {
      console.trace(err);

      return res.status(500).json({
        error: 'Error revalidating api/user ' + err,
      });
    }
  } else {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }
});
