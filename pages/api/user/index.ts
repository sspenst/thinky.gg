import Role from '@root/constants/role';
import sendEmailConfirmationEmail from '@root/lib/sendEmailConfirmToken';
import UserConfig from '@root/models/db/userConfig';
import bcrypt from 'bcryptjs';
import mongoose, { Types } from 'mongoose';
import type { NextApiResponse } from 'next';
import Stripe from 'stripe';
import TestId from '../../../constants/testId';
import { ValidType } from '../../../helpers/apiWrapper';
import { enrichReqUser } from '../../../helpers/enrich';
import { generateCollectionSlug, generateLevelSlug } from '../../../helpers/generateSlug';
import { TimerUtil } from '../../../helpers/getTs';
import { logger } from '../../../helpers/logger';
import cleanUser from '../../../lib/cleanUser';
import clearTokenCookie from '../../../lib/clearTokenCookie';
import dbConnect from '../../../lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import { CollectionModel, CommentModel, GraphModel, KeyValueModel, LevelModel, MultiplayerProfileModel, NotificationModel, UserConfigModel, UserModel } from '../../../models/mongoose';
import { getSubscription } from '../subscription';
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
  await dbConnect();

  if (req.method === 'GET') {
    const [enrichedUser, multiplayerProfile, userConfig] = await Promise.all([
      enrichReqUser(req.user),
      MultiplayerProfileModel.findOne({ 'userId': req.user._id }),
      getUserConfig(req.user._id),
    ]);

    cleanUser(enrichedUser);

    return res.status(200).json({ ...enrichedUser, ...{
      config: userConfig,
      multiplayerProfile: multiplayerProfile,
    } });
  } else if (req.method === 'PUT') {
    const {
      bio,
      currentPassword,
      email,
      hideStatus,
      name,
      password,
    } = req.body;
    let isGuest = req.user.roles.includes(Role.GUEST);

    if (password) {
      const user = await UserModel.findById(req.userId, '+password', { lean: false });

      if (!isGuest) {
        if (!(await bcrypt.compare(currentPassword, user.password))) {
          return res.status(401).json({
            error: 'Incorrect email or password',
          });
        }
      } else {
        // remove GUEST role
        user.roles = user.roles.filter((role: Role) => role !== Role.GUEST);
        isGuest = false;
      }

      user.password = password;
      await user.save();
    }

    const setObj: {[k: string]: string} = {};

    if (hideStatus !== undefined) {
      setObj['hideStatus'] = hideStatus;
    }

    if (email) {
      setObj['email'] = email.trim();
    }

    if (bio !== undefined) {
      setObj['bio'] = bio.trim();
    }

    const trimmedName = name?.trim();

    if (trimmedName) {
      setObj['name'] = trimmedName;
    }

    if (!password && Object.entries(setObj).length === 0) {
      return res.status(400).json({
        error: 'Bad request: No data provided',
      });
    }

    try {
      const newUser = await UserModel.findOneAndUpdate({ _id: req.userId }, { $set: setObj }, { runValidators: true, new: true, projection: { _id: true, email: true, name: true } });

      if (setObj['email'] && !isGuest) {
        const userConfig = await UserConfigModel.findOneAndUpdate({ userId: req.userId }, {
          $set: {
            emailConfirmed: false,
            emailConfirmationToken: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
          }
        }, {
          new: true,
          projection: { emailConfirmationToken: 1, },
        });

        try {
          await sendEmailConfirmationEmail(req, newUser, userConfig as UserConfig);
        } catch (err) {
          logger.error(err);

          return res.status(400).json({ error: (err as Error).message || 'Error sending email' });
        }
      }
    } catch (err) {
      logger.error(err);

      return res.status(500).json({ error: 'Internal error' });
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
    }

    return res.status(200).json({ updated: true });
  } else if (req.method === 'DELETE') {
    // check if there is an active subscription
    const [code, data] = await getSubscription(req);

    if (code === 200) {
      const subscription = (data as Partial<Stripe.Subscription>);

      if (subscription.status === 'active' && subscription.cancel_at_period_end === false) {
        return res.status(400).json({ error: 'Please must cancel your subscription before deleting your account.' });
      }
    }

    const deletedAt = new Date();
    const session = await mongoose.startSession();
    const ts = TimerUtil.getTs();

    try {
      await session.withTransaction(async () => {
        const levels = await LevelModel.find<Level>({
          userId: req.userId,
        }, '_id name', { lean: true, session: session });

        for (const level of levels) {
          const slug = await generateLevelSlug('archive', level.name, level._id.toString(), { session: session });

          await LevelModel.updateOne({ _id: level._id }, { $set: {
            archivedBy: req.userId,
            archivedTs: ts,
            slug: slug,
            userId: new Types.ObjectId(TestId.ARCHIVE),
          } }, { session: session });
        }

        await Promise.all([
          GraphModel.deleteMany({ $or: [{ source: req.userId }, { target: req.userId }] }, { session: session }),
          // delete in keyvaluemodel where key contains userId
          KeyValueModel.deleteMany({ key: { $regex: `.*${req.userId}.*` } }, { session: session }),
          NotificationModel.deleteMany({ $or: [
            { source: req.userId },
            { target: req.userId },
            { userId: req.userId },
          ] }, { session: session }),
          UserConfigModel.deleteOne({ userId: req.userId }, { session: session }),
          UserModel.deleteOne({ _id: req.userId }, { session: session }), // TODO, should make this soft delete...
        ]);

        // delete all comments posted on this user's profile, and all their replies
        await CommentModel.aggregate([
          {
            $match: { $or: [
              { author: req.userId, deletedAt: null },
              { target: req.userId, deletedAt: null },
            ] },
          },
          {
            $set: {
              deletedAt: deletedAt,
            },
          },
          {
            $lookup: {
              from: 'comments',
              localField: '_id',
              foreignField: 'target',
              as: 'children',
              pipeline: [
                {
                  $match: {
                    deletedAt: null,
                  },
                },
                {
                  $set: {
                    deletedAt: deletedAt,
                  },
                },
              ],
            },
          },
        ], { session: session });
      });
      session.endSession();
    } catch (err) {
      logger.error(err);
      session.endSession();

      return res.status(500).json({ error: 'Internal server error' });
    }

    res.setHeader('Set-Cookie', clearTokenCookie(req.headers?.host));

    return res.status(200).json({ updated: true });
  }
});
