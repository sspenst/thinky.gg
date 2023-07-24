import getEmailConfirmationToken from '@root/helpers/getEmailConfirmationToken';
import isGuest from '@root/helpers/isGuest';
import sendEmailConfirmationEmail from '@root/lib/sendEmailConfirmationEmail';
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
    if (isGuest(req.user)) {
      return res.status(401).json({
        error: 'Unauthorized: Guest account',
      });
    }

    const {
      bio,
      currentPassword,
      email,
      hideStatus,
      name,
      password,
    } = req.body;

    if (password) {
      const user = await UserModel.findById(req.userId, '+password', { lean: false });

      if (!(await bcrypt.compare(currentPassword, user.password))) {
        return res.status(401).json({
          error: 'Incorrect email or password',
        });
      }

      user.password = password;
      await user.save();

      return res.status(200).json({ updated: true });
    }

    const setObj: {[k: string]: string} = {};

    if (hideStatus !== undefined) {
      setObj['hideStatus'] = hideStatus;
    }

    if (email !== undefined) {
      setObj['email'] = email.trim();
    }

    if (bio !== undefined) {
      setObj['bio'] = bio.trim();
    }

    const trimmedName = name?.trim();

    if (trimmedName) {
      setObj['name'] = trimmedName;
    }

    try {
      const newUser = await UserModel.findOneAndUpdate({ _id: req.userId }, { $set: setObj }, { runValidators: true, new: true, projection: { _id: 1, email: 1, name: 1 } });

      if (setObj['email']) {
        const userConfig = await UserConfigModel.findOneAndUpdate({ userId: req.userId }, {
          $set: {
            emailConfirmationToken: getEmailConfirmationToken(),
            emailConfirmed: false,
          }
        }, {
          new: true,
          projection: { emailConfirmationToken: 1, },
        });

        await sendEmailConfirmationEmail(req, newUser, userConfig as UserConfig);
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      logger.error(err);

      return res.status(500).json({ error: err.toString() || 'Internal error' });
    }

    if (trimmedName) {
      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          const levels = await LevelModel.find<Level>({
            isDeleted: { $ne: true },
            userId: req.userId,
          }, '_id name', { lean: true, session: session });

          for (const level of levels) {
            const slug = await generateLevelSlug(trimmedName, level.name, level._id.toString(), { session: session });

            await LevelModel.updateOne({ _id: level._id }, { $set: { slug: slug } }, { session: session });
          }

          // Do the same for collections
          const collections = await CollectionModel.find({
            userId: req.userId,
          }, '_id name', { lean: true, session: session });

          for (const collection of collections) {
            const slug = await generateCollectionSlug(trimmedName, collection.name, collection._id.toString(), { session: session });

            await CollectionModel.updateOne({ _id: collection._id }, { $set: { slug: slug } }, { session: session });
          }
        });

        session.endSession();
      } catch (err) {
        logger.error(err);
        session.endSession();

        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    return res.status(200).json({ updated: true });
  } else if (req.method === 'DELETE') {
    // check if there is an active subscription
    const [code, data] = await getSubscription(req);

    if (code === 200) {
      const subscription = (data as Partial<Stripe.Subscription>);

      if (subscription.status === 'active' && subscription.cancel_at_period_end === false) {
        return res.status(400).json({ error: 'You must cancel your subscription before deleting your account.' });
      }
    }

    const deletedAt = new Date();
    const session = await mongoose.startSession();
    const ts = TimerUtil.getTs();

    try {
      await session.withTransaction(async () => {
        const levels = await LevelModel.find<Level>({
          isDeleted: { $ne: true },
          isDraft: false,
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
