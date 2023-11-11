import { DIFFICULTY_INDEX, difficultyList } from '@root/components/formatted/formattedDifficulty';
import { LevelWithRecordHistory } from '@root/helpers/getRecordsByUserId';
import { IAchievementInfo } from './achievementInfo';
import AchievementType from './achievementType';

interface IAchievementInfoSkill extends IAchievementInfo {
  unlocked: ({ rollingLevelSolvesSum }: {rollingLevelSolvesSum: number[], records: LevelWithRecordHistory[]}) => boolean;
}

interface SkillRequirement {
  achievementType: AchievementType;
  difficultyIndex: DIFFICULTY_INDEX;
  levels: number;
}

export const skillRequirements: SkillRequirement[] = [
  {
    achievementType: AchievementType.PLAYER_RANK_SUPER_GRANDMASTER,
    difficultyIndex: DIFFICULTY_INDEX.SUPER_GRANDMASTER,
    levels: 7,
  },
  {
    achievementType: AchievementType.PLAYER_RANK_GRANDMASTER,
    difficultyIndex: DIFFICULTY_INDEX.GRANDMASTER,
    levels: 7,
  },
  {
    achievementType: AchievementType.PLAYER_RANK_PROFESSOR,
    difficultyIndex: DIFFICULTY_INDEX.PROFESSOR,
    levels: 10,
  },
  {
    achievementType: AchievementType.PLAYER_RANK_PHD,
    difficultyIndex: DIFFICULTY_INDEX.PHD,
    levels: 10,
  },
  {
    achievementType: AchievementType.PLAYER_RANK_MASTERS,
    difficultyIndex: DIFFICULTY_INDEX.MASTERS,
    levels: 10,
  },
  {
    achievementType: AchievementType.PLAYER_RANK_BACHELORS,
    difficultyIndex: DIFFICULTY_INDEX.BACHELORS,
    levels: 25,
  },
  {
    achievementType: AchievementType.PLAYER_RANK_HIGH_SCHOOL,
    difficultyIndex: DIFFICULTY_INDEX.HIGH_SCHOOL,
    levels: 25,
  },
  {
    achievementType: AchievementType.PLAYER_RANK_JUNIOR_HIGH,
    difficultyIndex: DIFFICULTY_INDEX.JUNIOR_HIGH,
    levels: 25,
  },
  {
    achievementType: AchievementType.PLAYER_RANK_ELEMENTARY,
    difficultyIndex: DIFFICULTY_INDEX.ELEMENTARY,
    levels: 25,
  },
  {
    achievementType: AchievementType.PLAYER_RANK_KINDERGARTEN,
    difficultyIndex: DIFFICULTY_INDEX.KINDERGARTEN,
    levels: 10,
  },
];

const AchievementRulesSkill: { [achievementType: string]: IAchievementInfoSkill; } = {};

skillRequirements.forEach(req => {
  const difficulty = difficultyList[req.difficultyIndex];

  AchievementRulesSkill[req.achievementType] = {
    description: `Solved ${req.levels} levels at ${difficulty.name} difficulty${req.difficultyIndex !== DIFFICULTY_INDEX.SUPER_GRANDMASTER ? ' or higher' : ''}`,
    emoji: difficulty.emoji,
    name: difficulty.name,
    unlocked: ({ rollingLevelSolvesSum }) => rollingLevelSolvesSum[req.difficultyIndex] >= req.levels,
  };
});

AchievementRulesSkill[AchievementType.RECORD_AFTER_1_YEAR] = {
  description: 'Discovered Record On Level After 1 Year of Level Creation',
  emoji: '🏜',
  name: 'Buried Treasure',
  secret: true,
  unlocked: ({ records }) => {
    console.log('Total records', records.length);

    for (const record of records) {
      const delta = record.records[0]?.ts - record?.ts;
      //const deltaYears = delta / 31536000;

      if (record.records.length > 1 && delta > 31536000) { // 1 year in seconds
        return true;
      }
    }

    return false;
  },
};

export default AchievementRulesSkill;
