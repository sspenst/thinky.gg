import { DIFFICULTY_NAMES, getDifficultyList } from '@root/components/formatted/formattedDifficulty';
import { IAchievementInfo } from './achievementInfo';
import AchievementType from './achievementType';

export const difficultyList = getDifficultyList();

export interface IAchievementInfoLevelCompletion extends IAchievementInfo {
  unlocked: ({ rollingLevelCompletionSum }: {rollingLevelCompletionSum: number[]}) => boolean;
}

interface CompletionRequirement {
  achievementType: AchievementType;
  difficultyName: DIFFICULTY_NAMES;
  levels: number;
}

const completionRequirements: CompletionRequirement[] = [
  {
    achievementType: AchievementType.PLAYER_RANK_SUPER_GRANDMASTER,
    difficultyName: DIFFICULTY_NAMES.SUPER_GRANDMASTER,
    levels: 7,
  },
  {
    achievementType: AchievementType.PLAYER_RANK_GRANDMASTER,
    difficultyName: DIFFICULTY_NAMES.GRANDMASTER,
    levels: 7,
  },
  {
    achievementType: AchievementType.PLAYER_RANK_PROFESSOR,
    difficultyName: DIFFICULTY_NAMES.PROFESSOR,
    levels: 10,
  },
  {
    achievementType: AchievementType.PLAYER_RANK_PHD,
    difficultyName: DIFFICULTY_NAMES.PHD,
    levels: 10,
  },
  {
    achievementType: AchievementType.PLAYER_RANK_MASTERS,
    difficultyName: DIFFICULTY_NAMES.MASTERS,
    levels: 10,
  },
  {
    achievementType: AchievementType.PLAYER_RANK_BACHELORS,
    difficultyName: DIFFICULTY_NAMES.BACHELORS,
    levels: 25,
  },
  {
    achievementType: AchievementType.PLAYER_RANK_HIGH_SCHOOL,
    difficultyName: DIFFICULTY_NAMES.HIGH_SCHOOL,
    levels: 25,
  },
  {
    achievementType: AchievementType.PLAYER_RANK_JUNIOR_HIGH,
    difficultyName: DIFFICULTY_NAMES.JUNIOR_HIGH,
    levels: 25,
  },
  {
    achievementType: AchievementType.PLAYER_RANK_ELEMENTARY,
    difficultyName: DIFFICULTY_NAMES.ELEMENTARY,
    levels: 25,
  },
  {
    achievementType: AchievementType.PLAYER_RANK_KINDERGARTEN,
    difficultyName: DIFFICULTY_NAMES.KINDERGARTEN,
    levels: 10,
  },
];

const AchievementRulesTableLevelCompletion: { [achievementType: string]: IAchievementInfoLevelCompletion; } = {};

completionRequirements.forEach(req => {
  const difficulty = difficultyList[req.difficultyName];

  AchievementRulesTableLevelCompletion[req.achievementType] = {
    description: `Completed ${req.levels} levels at ${difficulty.name} difficulty`,
    emoji: difficulty.emoji,
    name: difficulty.name,
    unlocked: ({ rollingLevelCompletionSum }) => rollingLevelCompletionSum[req.difficultyName] >= req.levels,
  };
});

export default AchievementRulesTableLevelCompletion;
