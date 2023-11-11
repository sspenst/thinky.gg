import { ProfileQueryType } from '@root/constants/profileQueryType';
import apiWrapper, { ValidCommaSeparated, ValidEnum } from '@root/helpers/apiWrapper';
import { getLevelsByDifficultyTable } from '@root/helpers/getLevelsByDifficultyTable';
import { getSolvesByDifficultyTable } from '@root/helpers/getSolvesByDifficultyTable';
import { Types } from 'mongoose';
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserById } from '../../user-by-id/[id]';

export async function getProfileQuery(userId: string, types: ProfileQueryType[]) {
  const [
    levelsByDifficulty,
    levelsSolvedByDifficulty,
    rankedSolvesByDifficulty,
    user,
  ] = await Promise.all([
    types.includes(ProfileQueryType.LevelsByDifficulty) ? getLevelsByDifficultyTable({ isRanked: true }) : null,
    types.includes(ProfileQueryType.LevelsSolvedByDifficulty) ? getSolvesByDifficultyTable(new Types.ObjectId(userId)) : null,
    types.includes(ProfileQueryType.RankedSolvesByDifficulty) ? getSolvesByDifficultyTable(new Types.ObjectId(userId), {}, { isRanked: true }) : null,
    types.includes(ProfileQueryType.User) ? getUserById(userId) : null,
  ]);

  return {
    [ProfileQueryType.LevelsByDifficulty]: levelsByDifficulty,
    [ProfileQueryType.LevelsSolvedByDifficulty]: levelsSolvedByDifficulty,
    [ProfileQueryType.RankedSolvesByDifficulty]: rankedSolvesByDifficulty,
    [ProfileQueryType.User]: user,
  };
}

export default apiWrapper({
  GET: {
    query: {
      type: ValidCommaSeparated(true, ValidEnum(Object.values(ProfileQueryType))),
    }
  }
}, async (req: NextApiRequest, res: NextApiResponse) => {
  const { id: userId, type } = req.query as { id: string, type: string };
  const types = type.split(',') as ProfileQueryType[];
  const json = await getProfileQuery(userId, types);

  // TODO: make this an object with a type definition (use it in formattedUser)
  return res.status(200).json(json);
});
