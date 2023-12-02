import { EmailDigestSettingTypes } from '@root/constants/emailDigest';
import { GameId } from '@root/constants/GameId';
import NotificationType from '@root/constants/notificationType';
import Role from '@root/constants/role';
import getEmailConfirmationToken from '@root/helpers/getEmailConfirmationToken';
import isGuest from '@root/helpers/isGuest';
import { logger } from '@root/helpers/logger';
import User from '@root/models/db/user';
import UserConfig from '@root/models/db/userConfig';
import { Types } from 'mongoose';
import type { NextApiResponse } from 'next';
import Theme from '../../../constants/theme';
import { ValidArray, ValidNumber, ValidType } from '../../../helpers/apiWrapper';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { UserConfigModel } from '../../../models/mongoose';

export function getNewUserConfig(gameId: GameId, roles: Role[], tutorialCompletedAt: number, userId: Types.ObjectId, params?: Partial<UserConfig>) {
  let emailDigest = EmailDigestSettingTypes.DAILY;

  if (roles.includes(Role.GUEST)) {
    emailDigest = EmailDigestSettingTypes.NONE;
  }

  const disallowedEmailNotifications = [
    NotificationType.NEW_FOLLOWER,
    NotificationType.NEW_LEVEL,
    NotificationType.NEW_LEVEL_ADDED_TO_COLLECTION,
    NotificationType.NEW_REVIEW_ON_YOUR_LEVEL,
    NotificationType.NEW_RECORD_ON_A_LEVEL_YOU_SOLVED,
  ];

  return {
    _id: new Types.ObjectId(),
    gameId: gameId,
    disallowedEmailNotifications: disallowedEmailNotifications,
    disallowedPushNotifications: [],
    emailDigest: emailDigest,
    theme: Theme.Modern,
    tutorialCompletedAt: tutorialCompletedAt,
    userId: userId,
    ...params,
  } as Partial<UserConfig>;
}

export async function getUserConfig(gameId: GameId, user: User) {
  let userConfig = await UserConfigModel.findOne({ userId: user._id, gameId: gameId }, { '__v': 0 }).lean<UserConfig>();

  if (!userConfig) {
    userConfig = await UserConfigModel.create(getNewUserConfig(gameId, user.roles, 0, user._id));
  }

  return userConfig;
}

export default withAuth({
  // NB: GET API currently unused - UserConfig returned through /api/user
  GET: {},
  PUT: {
    body: {
      deviceToken: ValidType('string', false),
      disallowedEmailNotifications: ValidArray(false),
      disallowedPushNotifications: ValidArray(false),
      emailDigest: ValidType('string', false),
      showPlayStats: ValidType('boolean', false),
      theme: ValidType('string', false),
      tutorialCompletedAt: ValidNumber(false),
      toursCompleted: ValidArray(false),
    }
  },
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const userConfig = await getUserConfig(req.gameId, req.user);

    return res.status(200).json(userConfig);
  } else if (req.method === 'PUT') {
    const {
      deviceToken,
      disallowedEmailNotifications,
      disallowedPushNotifications,
      emailDigest,
      showPlayStats,
      theme,
      toursCompleted,
      tutorialCompletedAt,
    } = req.body;

    const setObj: {[k: string]: string} = {};

    if (emailDigest !== undefined) {
      setObj['emailDigest'] = emailDigest;

      if (isGuest(req.user)) {
        return res.status(400).json({
          error: 'Guests cannot change email digest settings. Confirm your email to convert your account.',
        });
      }
    }

    if (showPlayStats !== undefined) {
      setObj['showPlayStats'] = showPlayStats;
    }

    if (theme !== undefined) {
      setObj['theme'] = theme;
    }

    if (tutorialCompletedAt) {
      setObj['tutorialCompletedAt'] = tutorialCompletedAt;
    }

    if (toursCompleted) {
      setObj['toursCompleted'] = toursCompleted;
    }

    if (disallowedEmailNotifications !== undefined) {
      setObj['disallowedEmailNotifications'] = disallowedEmailNotifications;
    }

    if (disallowedPushNotifications !== undefined) {
      setObj['disallowedPushNotifications'] = disallowedPushNotifications;
    }

    // check if setObj is blank
    if (!deviceToken && Object.keys(setObj).length === 0) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
      const updateResult = await UserConfigModel.updateOne({ userId: req.userId, gameId: req.gameId }, { $set: setObj, $addToSet: { mobileDeviceTokens: deviceToken } });

      /* istanbul ignore next */
      if (updateResult.acknowledged === false) {
        return res.status(500).json({ error: 'Error updating config', updated: false });
      }
    } catch (err) {
      logger.error(err);

      return res.status(500).json({ error: 'Error updating config', updated: false });
    }

    return res.status(200).json({ updated: true });
  }
});
