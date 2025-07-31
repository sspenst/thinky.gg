import { enrichReqUser } from '@root/helpers/enrich';
import getEmailConfirmationToken from '@root/helpers/getEmailConfirmationToken';
import isGuest from '@root/helpers/isGuest';
import { deleteUser } from '@root/helpers/userDeletion';
import sendEmailConfirmationEmail from '@root/lib/sendEmailConfirmationEmail';
import Collection from '@root/models/db/collection';
import MultiplayerProfile from '@root/models/db/multiplayerProfile';
import User from '@root/models/db/user';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import type { NextApiResponse } from 'next';
import AchievementCategory from '../../../constants/achievements/achievementCategory';
import { GameId } from '../../../constants/GameId';
import PrivateTagType from '../../../constants/privateTagType';
import { ValidType } from '../../../helpers/apiWrapper';
import { generateCollectionSlug, generateLevelSlug } from '../../../helpers/generateSlug';
import { logger } from '../../../helpers/logger';
import cleanUser from '../../../lib/cleanUser';
import clearTokenCookie from '../../../lib/clearTokenCookie';
import dbConnect from '../../../lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import { CollectionModel, LevelModel, MultiplayerProfileModel, UserModel } from '../../../models/mongoose';
import { queueRefreshAchievements } from '../internal-jobs/worker/queueFunctions';
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
      ...(req.impersonatingAdminId ? { impersonatingAdminId: req.impersonatingAdminId } : {}),
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
      disableAfterLevelPopup,
      disableStreakPopup,
      email,
      hideStatus,
      name,
      password,
    } = req.body;

    if (password) {
      const user = await UserModel.findById(req.user._id, '+password');

      // Regular password change - requires current password
      if (!currentPassword) {
        return res.status(400).json({
          error: 'Current password is required',
        });
      }

      if (!(await bcrypt.compare(currentPassword, user.password))) {
        return res.status(401).json({
          error: 'Incorrect email or password',
        });
      }

      user.password = password;

      // Add HAS_PASSWORD tag to indicate user has set a password they know
      await UserModel.updateOne(
        { _id: user._id },
        { $addToSet: { privateTags: PrivateTagType.HAS_PASSWORD } }
      );

      await user.save();

      return res.status(200).json({ updated: true });
    }

    const setObj: {[k: string]: string} = {};

    if (disableConfetti !== undefined) {
      setObj['disableConfetti'] = disableConfetti;
    }

    if (disableAfterLevelPopup !== undefined) {
      setObj['disableAfterLevelPopup'] = disableAfterLevelPopup;
    }

    if (disableStreakPopup !== undefined) {
      // shouldn't have to parse as boolean since mongoose should be doin that for us... i think
      setObj['disableStreakPopup'] = disableStreakPopup;
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
        // also need to set emailConfirmed to false
        newUser.emailConfirmed = false;
        await newUser.save();

        const error = await sendEmailConfirmationEmail(req, newUser);

        if (error) {
          return res.status(error.status).json({ error: error.message });
        }
      }

      // Queue achievement refresh if bio was updated
      if (bio !== undefined) {
        await queueRefreshAchievements(GameId.THINKY, req.user._id, [AchievementCategory.FEATURE_EXPLORER]);
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

    try {
      await deleteUser(req.user._id);
    } catch (err) {
      logger.error(err);

      return res.status(500).json({ error: 'Internal server error' });
    }

    res.setHeader('Set-Cookie', clearTokenCookie(req.headers?.host));

    return res.status(200).json({ updated: true });
  }
});
