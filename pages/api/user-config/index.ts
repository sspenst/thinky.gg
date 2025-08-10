import { GameId } from '@root/constants/GameId';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import isGuest from '@root/helpers/isGuest';
import isPro from '@root/helpers/isPro';
import { logger } from '@root/helpers/logger';
import User from '@root/models/db/user';
import UserConfig from '@root/models/db/userConfig';
import mongoose from 'mongoose';
import type { NextApiResponse } from 'next';
import { ValidArray, ValidNumber, ValidType } from '../../../helpers/apiWrapper';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { UserConfigModel, UserModel } from '../../../models/mongoose';

export async function getUserConfig(gameId: GameId, user: User) {
  let userConfig = await UserConfigModel.findOne({ userId: user._id, gameId: gameId }, { '__v': 0 }).lean<UserConfig>();

  if (!userConfig) {
    userConfig = await UserConfigModel.create({
      gameId: gameId,
      theme: getGameFromId(gameId).defaultTheme,
      tutorialCompletedAt: 0,
      userId: user._id,
    });
  }

  return userConfig;
}

export default withAuth({
  // NB: GET API currently unused - UserConfig returned through /api/user
  GET: {},
  PUT: {
    body: {
      customTheme: ValidType('string', false),
      deviceToken: ValidType('string', false),
      disallowedEmailNotifications: ValidArray(false),
      disallowedPushNotifications: ValidArray(false),
      disallowedInboxNotifications: ValidArray(false),
      emailDigest: ValidType('string', false),
      theme: ValidType('string', false),
      tutorialCompletedAt: ValidNumber(false),
      toursCompleted: ValidArray(false),
    }
  },
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const userConfig = await getUserConfig(req.gameId, req.user);

    return res.status(200).json({ ...userConfig, ...{ emailDigest: req.user.emailDigest } });
  } else if (req.method === 'PUT') {
    const {
      customTheme,
      deviceToken,
      disallowedEmailNotifications,
      disallowedPushNotifications,
      disallowedInboxNotifications,
      emailDigest,
      theme,
      toursCompleted,
      tutorialCompletedAt,
    } = req.body;

    const setObj: {[k: string]: string} = {};
    const setObjUser: {[k: string]: string} = {};

    if (emailDigest !== undefined) {
      setObjUser['emailDigest'] = emailDigest;

      if (isGuest(req.user)) {
        return res.status(400).json({
          error: 'Guests cannot change email digest settings. Confirm your email to convert your account.',
        });
      }
    }

    if (theme !== undefined) {
      setObj['theme'] = theme;
    }

    if (customTheme !== undefined) {
      if (!isPro(req.user)) {
        return res.status(400).json({ error: 'Custom themes are a Pro feature. Upgrade to Pro to use custom themes.' });
      }

      setObj['customTheme'] = customTheme;
    }

    if (tutorialCompletedAt) {
      setObj['tutorialCompletedAt'] = tutorialCompletedAt;
    }

    if (toursCompleted) {
      setObj['toursCompleted'] = toursCompleted;
    }

    if (disallowedEmailNotifications !== undefined) {
      setObjUser['disallowedEmailNotifications'] = disallowedEmailNotifications;
    }

    if (disallowedPushNotifications !== undefined) {
      setObjUser['disallowedPushNotifications'] = disallowedPushNotifications;
    }

    if (disallowedInboxNotifications !== undefined) {
      setObjUser['disallowedInboxNotifications'] = disallowedInboxNotifications;
    }

    // check if setObj is blank
    if (!deviceToken && (Object.keys(setObj).length === 0 && Object.keys(setObjUser).length === 0)) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          await UserConfigModel.updateOne({ userId: req.userId, gameId: req.gameId }, { $set: setObj, }, { session: session });
          await UserModel.updateOne({ _id: req.userId }, { $set: setObjUser, $addToSet: { mobileDeviceTokens: deviceToken } }, { session: session });
        });
      } catch (err) {
        logger.error(err);
        session.endSession();

        return res.status(500).json({ error: 'Error updating config', updated: false });
      }
    } catch (err) {
      logger.error(err);

      return res.status(500).json({ error: 'Error updating config', updated: false });
    }

    return res.status(200).json({ updated: true });
  }
});
