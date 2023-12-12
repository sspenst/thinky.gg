import User from '@root/models/db/user';

export enum ProfileQueryType {
  LevelsByDifficulty = 'levelsByDifficulty',
  LevelsSolvedByDifficulty = 'levelsSolvedByDifficulty',
  RankedSolvesByDifficulty = 'rankedSolvesByDifficulty',
  User = 'user',
}

export interface UserExtendedData {
  [ProfileQueryType.LevelsByDifficulty]: { [key: string]: number },
  [ProfileQueryType.LevelsSolvedByDifficulty]: { [key: string]: number },
  [ProfileQueryType.RankedSolvesByDifficulty]: { [key: string]: number },
  [ProfileQueryType.User]: User;
}
