import apiWrapper, { ValidEnum } from '@root/helpers/apiWrapper';
import { getCompletionByDifficultyTable } from '@root/helpers/getCompletionByDifficultyTable';
import { Types } from 'mongoose';
import { NextApiRequest, NextApiResponse } from 'next';

enum ProfileQueryType {
    LevelsCompletedByDifficulty = 'levelsCompletedByDifficulty',
}

export default apiWrapper({
  GET: {
    query: {
      type: ValidEnum(Object.values(ProfileQueryType)),
    }
  }
}, async (req: NextApiRequest, res: NextApiResponse) => {
  const { id: userId, type } = req.query as { id: string, type: string };
  let levelsCompletedByDifficulty;

  if (type === ProfileQueryType.LevelsCompletedByDifficulty) {
    levelsCompletedByDifficulty = await getCompletionByDifficultyTable(new Types.ObjectId(userId));
  }

  return res.status(200).json({
    [ProfileQueryType.LevelsCompletedByDifficulty]: levelsCompletedByDifficulty,
  });
});
