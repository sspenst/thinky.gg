import bcrypt from 'bcrypt';
import type { NextApiResponse } from 'next';
import generateSlug from '../../../helpers/generateSlug';
import { logger } from '../../../helpers/logger';
import revalidateCatalog from '../../../helpers/revalidateCatalog';
import { cleanUser } from '../../../lib/cleanUser';
import clearTokenCookie from '../../../lib/clearTokenCookie';
import dbConnect from '../../../lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import { LevelModel, ReviewModel, StatModel, UserConfigModel, UserModel } from '../../../models/mongoose';

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
        setObj['name'] = name.trim();
      }

      try {
        await UserModel.updateOne({ _id: req.userId }, { $set: setObj }, { runValidators: true });
      } catch (err){
        return res.status(400).json({ updated: false });
      }

      if (name) {
        // TODO: in extremely rare cases there could be a race condition, might need a transaction here
        const levels = await LevelModel.find<Level>({
          userId: req.userId,
        }, '_id name', { lean: true });

        for (const level of levels) {
          const slug = await generateSlug(name, level.name, level._id.toString());

          await LevelModel.updateOne({ _id: level._id }, { $set: { slug: slug } });
        }

        try {
          const revalidateRes = await revalidateCatalog(res);

          if (!revalidateRes) {
            throw 'Error revalidating catalog';
          } else {
            return res.status(200).json({ updated: true });
          }
        } catch (err) {
          logger.trace(err);

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
      const revalidateRes = await revalidateCatalog(res);

      if (!revalidateRes) {
        throw 'Error revalidating catalog';
      } else {
        return res.status(200).json({ updated: true });
      }
    } catch (err) {
      logger.trace(err);

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
