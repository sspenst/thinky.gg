import { ProfileQueryType } from '@root/constants/profileQueryType';
import apiWrapper, { ValidCommaSeparated, ValidEnum } from '@root/helpers/apiWrapper';
import { getCompletionByDifficultyTable } from '@root/helpers/getCompletionByDifficultyTable';
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

  const typeArray = type.split(',');

  const [levelsCompletedByDifficulty, user] = await Promise.all([
    typeArray.includes(ProfileQueryType.LevelsCompletedByDifficulty) ? getCompletionByDifficultyTable(new Types.ObjectId(userId)) : null,
    typeArray.includes(ProfileQueryType.User) ? getUserById(userId) : null,
  ]);

  return res.status(200).json({
    [ProfileQueryType.LevelsCompletedByDifficulty]: levelsCompletedByDifficulty,
    [ProfileQueryType.User]: user,
  });
});
