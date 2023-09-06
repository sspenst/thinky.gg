import { AchievementCategory } from '@root/constants/achievementInfo';
import Role from '@root/constants/role';
import { ValidEnum, ValidObjectId } from '@root/helpers/apiWrapper';
import withAuth, { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { calcPlayAttempts, refreshIndexCalcs } from '@root/models/schemas/levelSchema';
import { refreshAchievements } from '@root/tests/helpers/refreshAchievements';
import { Types } from 'mongoose';
import { NextApiResponse } from 'next';

enum AdminCommand {
    refreshAchievements = 'refreshAchievements',
    refreshIndexCalcs = 'refreshIndexCalcs',
    refreshPlayAttempts = 'calcPlayAttempts',
}
export default withAuth({ POST: {
  body: {
    targetId: ValidObjectId(),
    command: ValidEnum(Object.values(AdminCommand)),
  }
} }, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (!req.user.roles.includes(Role.ADMIN)) {
    return res.status(401).json({
      error: 'Not authorized'
    });
  }

  const { targetId, command } = req.body;
  let resp = null;

  try {
    switch (command) {
    case AdminCommand.refreshAchievements:
      resp = await refreshAchievements(new Types.ObjectId(targetId as string), Object.values(AchievementCategory));
      resp = resp.length;
      break;
    case AdminCommand.refreshIndexCalcs:
      await refreshIndexCalcs(new Types.ObjectId(targetId as string));
      break;
    case AdminCommand.refreshPlayAttempts:
      await calcPlayAttempts(new Types.ObjectId(targetId as string));
      break;
    default:
      return res.status(400).json({
        error: command + ' is an invalid command'
      });
    }
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
