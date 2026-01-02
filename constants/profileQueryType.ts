import User from '@root/models/db/user';

export enum ProfileQueryType {
  LevelsByDifficulty = 'levelsByDifficulty',
  LevelsSolvedByDifficulty = 'levelsSolvedByDifficulty',
  RankedSolvesByDifficulty = 'rankedSolvesByDifficulty',
  User = 'user',
}

export interface UserExtendedData {
  [ProfileQueryType.LevelsByDifficulty]: Record<string, number>,
  [ProfileQueryType.LevelsSolvedByDifficulty]: Record<string, number>,
  [ProfileQueryType.RankedSolvesByDifficulty]: Record<string, number>,
  [ProfileQueryType.User]: User;
}
