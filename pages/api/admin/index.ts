import { AchievementCategory } from '@root/constants/achievements/achievementInfo';
import NotificationType from '@root/constants/notificationType';
import Role from '@root/constants/role';
import { ValidEnum, ValidObjectId, ValidType } from '@root/helpers/apiWrapper';
import { createNewAdminMessageNotifications } from '@root/helpers/notificationHelper';
import { refreshAchievements } from '@root/helpers/refreshAchievements';
import withAuth, { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { AchievementModel, NotificationModel, UserModel } from '@root/models/mongoose';
import { calcPlayAttempts, refreshIndexCalcs } from '@root/models/schemas/levelSchema';
import { Types } from 'mongoose';
import { NextApiResponse } from 'next';
import { processQueueMessages } from '../internal-jobs/worker';

enum AdminCommand {
  refreshAchievements = 'refreshAchievements',
  refreshIndexCalcs = 'refreshIndexCalcs',
  deleteAchievements = 'deleteAchievements',
  refreshPlayAttempts = 'calcPlayAttempts',
  sendAdminMessage = 'sendAdminMessage',
}

interface AdminBodyProps {
  targetId: string;
  command: AdminCommand;
  role: Role | null;
  payload: string;
}

export default withAuth({ POST: {
  body: {
    targetId: ValidObjectId(false),
    command: ValidEnum(Object.values(AdminCommand)),
    role: ValidEnum(Object.values(Role), false),
    payload: ValidType('string', false),
  }
} }, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (!req.user.roles.includes(Role.ADMIN)) {
    return res.status(401).json({
      error: 'Not authorized'
    });
  }

  const { targetId, command, role, payload } = req.body as AdminBodyProps;
  let resp = null;

  try {
    switch (command) {
    case AdminCommand.refreshAchievements:
      resp = await refreshAchievements(new Types.ObjectId(targetId as string), Object.values(AchievementCategory));
      await processQueueMessages();
      break;
    case AdminCommand.deleteAchievements:
      resp = await Promise.all([
        AchievementModel.deleteMany({ userId: new Types.ObjectId(targetId as string) }),
        NotificationModel.deleteMany({ userId: new Types.ObjectId(targetId as string), type: NotificationType.NEW_ACHIEVEMENT }),
      ]);
      break;
    case AdminCommand.refreshIndexCalcs:
      await refreshIndexCalcs(new Types.ObjectId(targetId as string));
      break;
    case AdminCommand.refreshPlayAttempts:
      await calcPlayAttempts(new Types.ObjectId(targetId as string));
      break;

    case AdminCommand.sendAdminMessage: {
      const userIdsAgg = await UserModel.aggregate([
        ...(role ? [{ $match: { roles: role } }] : []),
        { $project: { _id: 1 } },
        { $group: { _id: null, userIds: { $push: '$_id' } } },
      ]);

      const userIds = userIdsAgg[0].userIds as Types.ObjectId[];

      await createNewAdminMessageNotifications(userIds, payload);

      break;
    }

    default:
      return res.status(400).json({
        error: command + ' is an invalid command'
      });
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    return res.status(500).json({
      error: e.message
    });
  }

  return res.status(200).json({
    success: true,
    resp: resp
  });
});
