import { ProfileQueryType } from '@root/constants/profileQueryType';
import apiWrapper, { ValidCommaSeparated, ValidEnum } from '@root/helpers/apiWrapper';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { getSolvesByDifficultyTable } from '@root/helpers/getSolvesByDifficultyTable';
import { Types } from 'mongoose';
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserById } from '../../user-by-id/[id]';

export default apiWrapper({
  GET: {
    query: {
      type: ValidCommaSeparated(true, ValidEnum(Object.values(ProfileQueryType))),
    }
  }
}, async (req: NextApiRequest, res: NextApiResponse) => {
  const { id: userId, type } = req.query as { id: string, type: string };
  const gameId = getGameIdFromReq(req);
  const typeArray = type.split(',');

  const [levelsSolvedByDifficulty, user] = await Promise.all([
    typeArray.includes(ProfileQueryType.LevelsSolvedByDifficulty) ? getSolvesByDifficultyTable(gameId, new Types.ObjectId(userId)) : null,
    typeArray.includes(ProfileQueryType.User) ? getUserById(userId) : null,
  ]);

  // TODO: make this an object with a type definition (use it in formattedUser)
  return res.status(200).json({
    [ProfileQueryType.LevelsSolvedByDifficulty]: levelsSolvedByDifficulty,
    [ProfileQueryType.User]: user,
  });
});
