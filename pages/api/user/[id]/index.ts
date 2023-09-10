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
  let levelsCompletedByDifficulty, user;

  const typeArray = type.split(',');

  if (typeArray.includes(ProfileQueryType.LevelsCompletedByDifficulty)) {
    levelsCompletedByDifficulty = await getCompletionByDifficultyTable(new Types.ObjectId(userId));
  }

  if (typeArray.includes(ProfileQueryType.User)) {
    user = await getUserById(userId);
  }

  return res.status(200).json({
    [ProfileQueryType.LevelsCompletedByDifficulty]: levelsCompletedByDifficulty,
    [ProfileQueryType.User]: user,
  });
});
