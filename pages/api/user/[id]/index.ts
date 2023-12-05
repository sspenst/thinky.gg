import { GameId } from '@root/constants/GameId';
import { ProfileQueryType, UserExtendedData } from '@root/constants/profileQueryType';
import apiWrapper, { NextApiRequestGuest, ValidCommaSeparated, ValidEnum } from '@root/helpers/apiWrapper';
import { getLevelsByDifficultyTable } from '@root/helpers/getLevelsByDifficultyTable';
import { getSolvesByDifficultyTable } from '@root/helpers/getSolvesByDifficultyTable';
import { Types } from 'mongoose';
import { NextApiResponse } from 'next';
import { getUserById } from '../../user-by-id/[id]';

export async function getProfileQuery(gameId: GameId, userId: string, types: ProfileQueryType[]) {
  const [
    levelsByDifficulty,
    levelsSolvedByDifficulty,
    rankedSolvesByDifficulty,
    user,
  ] = await Promise.all([
    types.includes(ProfileQueryType.LevelsByDifficulty) ? getLevelsByDifficultyTable(gameId, { isRanked: true }) : null,
    types.includes(ProfileQueryType.LevelsSolvedByDifficulty) ? getSolvesByDifficultyTable(gameId, new Types.ObjectId(userId)) : null,
    types.includes(ProfileQueryType.RankedSolvesByDifficulty) ? getSolvesByDifficultyTable(gameId, new Types.ObjectId(userId), {}, { isRanked: true }) : null,
    types.includes(ProfileQueryType.User) ? getUserById(userId, gameId) : null,
  ]);

  return {
    [ProfileQueryType.LevelsByDifficulty]: levelsByDifficulty,
    [ProfileQueryType.LevelsSolvedByDifficulty]: levelsSolvedByDifficulty,
    [ProfileQueryType.RankedSolvesByDifficulty]: rankedSolvesByDifficulty,
    [ProfileQueryType.User]: user,
  } as UserExtendedData;
}

export default apiWrapper({
  GET: {
    query: {
      type: ValidCommaSeparated(true, ValidEnum(Object.values(ProfileQueryType))),
    }
  }
}, async (req: NextApiRequestGuest, res: NextApiResponse) => {
  const { id: userId, type } = req.query as { id: string, type: string };
  const types = type.split(',') as ProfileQueryType[];
  const json = await getProfileQuery(req.gameId, userId, types);

  return res.status(200).json(json);
});
