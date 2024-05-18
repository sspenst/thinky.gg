import { enrichReqUser } from '@root/helpers/enrich';
import getEmailConfirmationToken from '@root/helpers/getEmailConfirmationToken';
import isGuest from '@root/helpers/isGuest';
import sendEmailConfirmationEmail from '@root/lib/sendEmailConfirmationEmail';
import Collection from '@root/models/db/collection';
import MultiplayerProfile from '@root/models/db/multiplayerProfile';
import User from '@root/models/db/user';
import bcrypt from 'bcryptjs';
import mongoose, { Types } from 'mongoose';
import type { NextApiResponse } from 'next';
import TestId from '../../../constants/testId';
import { ValidType } from '../../../helpers/apiWrapper';
import { generateCollectionSlug, generateLevelSlug } from '../../../helpers/generateSlug';
import { TimerUtil } from '../../../helpers/getTs';
import { logger } from '../../../helpers/logger';
import cleanUser from '../../../lib/cleanUser';
import clearTokenCookie from '../../../lib/clearTokenCookie';
import dbConnect from '../../../lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import { AchievementModel, CollectionModel, CommentModel, DeviceModel, GraphModel, KeyValueModel, LevelModel, MultiplayerProfileModel, NotificationModel, UserConfigModel, UserModel } from '../../../models/mongoose';
import { getSubscriptions, SubscriptionData } from '../subscription';
import { getUserConfig } from '../user-config';

export default withAuth({
  GET: {},
  PUT: {
    body: {
      currentPassword: ValidType('string', false),
      disableConfetti: ValidType('boolean', false),
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
      enrichReqUser(req.gameId, req.user),
      MultiplayerProfileModel.findOne({ 'userId': req.user._id, gameId: req.gameId }).lean<MultiplayerProfile>(),
      getUserConfig(req.gameId, req.user),
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
      disableConfetti,
      email,
      hideStatus,
      name,
      password,
    } = req.body;

    if (password) {
      const user = await UserModel.findById(req.user._id, '+password');

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

    if (disableConfetti !== undefined) {
      setObj['disableConfetti'] = disableConfetti;
    }

    if (hideStatus !== undefined) {
      setObj['hideStatus'] = hideStatus;
    }

    if (email !== undefined) {
      const emailTrimmed = email.trim();

      if (emailTrimmed.length === 0) {
        return res.status(400).json({ error: 'Email cannot be empty' });
      }

      if (emailTrimmed !== req.user.email) {
        const userWithEmail = await UserModel.findOne({ email: email.trim() }, '_id').lean<User>();

        if (userWithEmail) {
          return res.status(400).json({ error: 'Email already taken' });
        }
      }

      setObj['email'] = emailTrimmed;
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
      const newUser = await UserModel.findOneAndUpdate({ _id: req.user._id }, { $set: setObj }, { runValidators: true, new: true, projection: { _id: 1, email: 1, name: 1, emailConfirmationToken: 1 } });

      if (setObj['email']) {
        newUser.emailConfirmationToken = getEmailConfirmationToken();
        await newUser.save();

        const error = await sendEmailConfirmationEmail(req, newUser);

        if (error) {
          return res.status(error.status).json({ error: error.message });
        }
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
            userId: req.user._id,
            isDeleted: { $ne: true },
            gameId: req.gameId,
          }, '_id name', { session: session }).lean<Level[]>();

          for (const level of levels) {
            const slug = await generateLevelSlug(level.gameId, trimmedName, level.name, level._id.toString(), { session: session });

            await LevelModel.updateOne({ _id: level._id }, { $set: { slug: slug } }, { session: session });
          }

          // Do the same for collections
          const collections = await CollectionModel.find({
            userId: req.user._id,
            gameId: req.gameId,
          }, '_id name', { session: session }).lean<Collection[]>();

          for (const collection of collections) {
            const slug = await generateCollectionSlug(req.gameId, trimmedName, collection.name, collection._id.toString(), { session: session });

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
          return res.status(400).json({ error: 'You must cancel all subscriptions before deleting your account. Contact help@thinky.gg if you are still experiencing issues' });
        }
      }
    }

    const deletedAt = new Date();
    const session = await mongoose.startSession();
    const ts = TimerUtil.getTs();

    try {
      await session.withTransaction(async () => {
        const levels = await LevelModel.find<Level>({
          userId: req.user._id,
          isDeleted: { $ne: true },
          isDraft: false,
          gameId: req.gameId,
        }, '_id name', { session: session }).lean<Level[]>();

        for (const level of levels) {
          const slug = await generateLevelSlug(level.gameId, 'archive', level.name, level._id.toString(), { session: session });

          // TODO: promise.all this?
          await LevelModel.updateOne({ _id: level._id }, { $set: {
            userId: new Types.ObjectId(TestId.ARCHIVE),
            archivedBy: req.user._id,
            archivedTs: ts,
            slug: slug,
          } }, { session: session });
        }

        // delete all comments posted on this user's profile, and all their replies
        const commentAgg = await CommentModel.aggregate([
          {
            $match: {
              deletedAt: null,
              targetModel: 'User',
              $or: [
                { author: req.user._id },
                { target: req.user._id },
              ],
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
                  $project: {
                    _id: 1,
                  },
                },
              ],
            },
          },
          {
            $project: {
              _id: 1,
              children: 1,
            },
          },
        ], { session: session });

        const commentIdsToDelete = [];

        for (const comment of commentAgg) {
          commentIdsToDelete.push(comment._id);

          for (const child of comment.children) {
            commentIdsToDelete.push(child._id);
          }
        }

        await Promise.all([
          AchievementModel.deleteMany({ userId: req.user._id }, { session: session }),
          CollectionModel.deleteMany({ userId: req.user._id }, { session: session }),
          CommentModel.updateMany({ _id: { $in: commentIdsToDelete } }, { $set: { deletedAt: deletedAt } }, { session: session }),
          DeviceModel.deleteMany({ userId: req.user._id }, { session: session }),
          GraphModel.deleteMany({ $or: [{ source: req.user._id }, { target: req.user._id }] }, { session: session }),
          // delete in keyvaluemodel where key contains userId
          KeyValueModel.deleteMany({ key: { $regex: `.*${req.user._id}.*` } }, { session: session }),
          // delete draft levels
          LevelModel.updateMany({ userId: req.user._id, isDraft: true }, { $set: { isDeleted: true } }, { session: session }),
          NotificationModel.deleteMany({ $or: [
            { source: req.user._id },
            { target: req.user._id },
            { userId: req.user._id },
          ] }, { session: session }),
          UserConfigModel.deleteMany({ userId: req.user._id }, { session: session }),
          UserModel.deleteOne({ _id: req.user._id }, { session: session }), // TODO, should make this soft delete...
        ]);
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
