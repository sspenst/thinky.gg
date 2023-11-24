import getEmailConfirmationToken from '@root/helpers/getEmailConfirmationToken';
import isGuest from '@root/helpers/isGuest';
import sendEmailConfirmationEmail from '@root/lib/sendEmailConfirmationEmail';
import Collection from '@root/models/db/collection';
import MultiplayerProfile from '@root/models/db/multiplayerProfile';
import User from '@root/models/db/user';
import UserConfig from '@root/models/db/userConfig';
import bcrypt from 'bcryptjs';
import mongoose, { Types } from 'mongoose';
import type { NextApiResponse } from 'next';
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
import { AchievementModel, CollectionModel, CommentModel, GraphModel, KeyValueModel, LevelModel, MultiplayerProfileModel, NotificationModel, UserConfigModel, UserModel } from '../../../models/mongoose';
import { getSubscriptions, SubscriptionData } from '../subscription';
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
    const [countUnread, multiplayerProfile, userConfig] = await Promise.all([
      //NotificationModel.countDocuments({ userId: req.user._id, read: false }).lean<number>(),
      0,
      MultiplayerProfileModel.findOne({ 'userId': req.user._id }).lean<MultiplayerProfile>(),
      getUserConfig(req.gameId, req.user),
    ]);
    const enrichedUser = { ...req.user, unreadNotifCount: countUnread };

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
      const user = await UserModel.findById(req.userId, '+password');

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
      const emailTrimmed = email.trim();

      if (emailTrimmed.length === 0) {
        return res.status(400).json({ error: 'Email cannot be empty' });
      }

      if (emailTrimmed !== req.user.email) {
        setObj['email'] = emailTrimmed;
        const userWithEmail = await UserModel.findOne({ email: email.trim() }, '_id').lean<User>();

        if (userWithEmail) {
          return res.status(400).json({ error: 'Email already taken' });
        }
      }
    }

    if (bio !== undefined) {
      setObj['bio'] = bio.trim();
    }

    // /^[-a-zA-Z0-9_]+$/.test(v);
    const trimmedName = name?.trim();
    const nameValid = /^[a-zA-Z0-9_]+$/.test(trimmedName);

    if (name !== undefined && !nameValid) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
    }

    if (name !== undefined && trimmedName.length === 0) {
      return res.status(400).json({ error: 'Username cannot be empty' });
    }

    if (trimmedName && trimmedName !== req.user.name ) {
      setObj['name'] = trimmedName;
      const userWithUsername = await UserModel.findOne({ name: trimmedName }, '_id').lean<User>();

      if (userWithUsername) {
        return res.status(400).json({ error: 'Username already taken' });
      }
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
          const levels = await LevelModel.find({
            userId: req.userId,
            isDeleted: { $ne: true },
          }, '_id name', { session: session }).lean<Level[]>();

          for (const level of levels) {
            const slug = await generateLevelSlug(trimmedName, level.name, level._id.toString(), { session: session });

            await LevelModel.updateOne({ _id: level._id }, { $set: { slug: slug } }, { session: session });
          }

          // Do the same for collections
          const collections = await CollectionModel.find({
            userId: req.userId,
          }, '_id name', { session: session }).lean<Collection[]>();

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
    const [code, data] = await getSubscriptions(req);

    if (code === 200) {
      for (const subscription of data as SubscriptionData[]) {
        if (subscription.status === 'active' && subscription.cancel_at_period_end === false) {
          return res.status(400).json({ error: 'You must cancel all subscriptions before deleting your account. Contact help@pathology.gg if you are still experiencing issues' });
        }
      }
    }

    const deletedAt = new Date();
    const session = await mongoose.startSession();
    const ts = TimerUtil.getTs();

    try {
      await session.withTransaction(async () => {
        const levels = await LevelModel.find<Level>({
          userId: req.userId,
          isDeleted: { $ne: true },
          isDraft: false,
        }, '_id name', { session: session }).lean<Level[]>();

        for (const level of levels) {
          const slug = await generateLevelSlug('archive', level.name, level._id.toString(), { session: session });

          // TODO: promise.all this?
          await LevelModel.updateOne({ _id: level._id }, { $set: {
            userId: new Types.ObjectId(TestId.ARCHIVE),
            archivedBy: req.userId,
            archivedTs: ts,
            slug: slug,

          } }, { session: session });
        }

        await Promise.all([
          AchievementModel.deleteMany({ userId: req.userId }),
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
              from: CommentModel.collection.name,
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
