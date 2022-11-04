import bcrypt from 'bcrypt';
import type { NextApiResponse } from 'next';
import { ValidType } from '../../../helpers/apiWrapper';
import { enrichReqUser } from '../../../helpers/enrich';
import { generateCollectionSlug, generateLevelSlug } from '../../../helpers/generateSlug';
import { logger } from '../../../helpers/logger';
import revalidateUrl, { RevalidatePaths } from '../../../helpers/revalidateUrl';
import cleanUser from '../../../lib/cleanUser';
import clearTokenCookie from '../../../lib/clearTokenCookie';
import dbConnect from '../../../lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import { CollectionModel, GraphModel, KeyValueModel, LevelModel, ReviewModel, StatModel, UserConfigModel, UserModel } from '../../../models/mongoose';
import { getUserConfig } from '../user-config';

export default withAuth({
  GET: {},
  PUT: {
    body: {
      currentPassword: ValidType('string', false),
      email: ValidType('string', false),
      hideStatus: ValidType('boolean', false),
      name: ValidType('string', false),
      password: ValidType('string', false),
    }
  },
  DELETE: {},
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'GET') {
    await dbConnect();

    const enrichedUser = await enrichReqUser(req.user);

    cleanUser(enrichedUser);
    const userConfig = await getUserConfig(req.user._id);

    return res.status(200).json({ ...enrichedUser, ...{ config: userConfig } });
  } else if (req.method === 'PUT') {
    await dbConnect();

    const {
      bio,
      currentPassword,
      email,
      hideStatus,
      name,
      password,
    } = req.body;

    if (password) {
      const user = await UserModel.findById(req.userId, {}, { lean: false });

      if (!(await bcrypt.compare(currentPassword, user.password))) {
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

      if (bio) {
        setObj['bio'] = bio.trim();
      }

      const trimmedName = name?.trim();

      if (trimmedName) {
        setObj['name'] = trimmedName;
      }

      try {
        await UserModel.updateOne({ _id: req.userId }, { $set: setObj }, { runValidators: true });
      } catch (err){
        return res.status(400).json({ updated: false });
      }

      if (trimmedName) {
        // TODO: in extremely rare cases there could be a race condition, might need a transaction here
        const levels = await LevelModel.find<Level>({
          userId: req.userId,
        }, '_id name', { lean: true });

        for (const level of levels) {
          const slug = await generateLevelSlug(trimmedName, level.name, level._id.toString());

          await LevelModel.updateOne({ _id: level._id }, { $set: { slug: slug } });
        }

        // Do the same for collections
        const collections = await CollectionModel.find({
          userId: req.userId,
        }, '_id name', { lean: true });

        for (const collection of collections) {
          const slug = await generateCollectionSlug(trimmedName, collection.name, collection._id.toString());

          await CollectionModel.updateOne({ _id: collection._id }, { $set: { slug: slug } });
        }

        try {
          const revalidateRes = await revalidateUrl(res, RevalidatePaths.CATALOG);

          /* istanbul ignore next */
          if (!revalidateRes) {
            throw new Error('Error revalidating catalog');
          } else {
            return res.status(200).json({ updated: true });
          }
        } catch (err) {
          logger.error(err);

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
      GraphModel.deleteMany({ target: req.userId }),
      GraphModel.deleteMany({ source: req.userId }),
      // delete in keyvaluemodel where key contains userId
      KeyValueModel.deleteMany({ key: { $regex: `.*${req.userId}.*` } }),
    ]);

    res.setHeader('Set-Cookie', clearTokenCookie(req.headers?.host));

    try {
      const revalidateRes = await revalidateUrl(res, RevalidatePaths.CATALOG);

      /* istanbul ignore next */
      if (!revalidateRes) {
        throw new Error('Error revalidating catalog');
      } else {
        return res.status(200).json({ updated: true });
      }
    } catch (err) {
      logger.error(err);

      return res.status(500).json({
        error: 'Error revalidating api/user ' + err,
      });
    }
  }
});
