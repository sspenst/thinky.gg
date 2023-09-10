import AchievementRulesTableLevelCompletion from '@root/constants/achievements/AchievementRulesTableLevelCompletion';
import AchievementType from '@root/constants/achievements/achievementType';
import { getDifficultyRollingSum } from '@root/helpers/playerRankHelper';
import User from '@root/models/db/user';
import { ProfileTab } from '@root/pages/profile/[name]/[[...tab]]';
import Link from 'next/link';
import React from 'react';
import FormattedDifficulty, { DIFFICULTY_NAMES, getDifficultyList } from '../formatted/formattedDifficulty';

// TODO: this array shouldn't need to exist (names are already in getDifficultyList)
const DIFFICULTY_PRETTY_NAMES = [
  'Pending',
  'Kindergarten',
  'Elementary',
  'Junior High',
  'Highschool',
  'Bachelors',
  'Masters',
  'PhD',
  'Professor',
  'Grandmaster',
  'Super Grandmaster',
];

const difficultyRequirements = [
  {
    name: DIFFICULTY_PRETTY_NAMES[DIFFICULTY_NAMES.SUPER_GRANDMASTER],
    requirement: AchievementRulesTableLevelCompletion[AchievementType.PLAYER_RANK_SUPER_GRANDMASTER].unlocked,
  },
  {
    name: DIFFICULTY_PRETTY_NAMES[DIFFICULTY_NAMES.GRANDMASTER],
    requirement: AchievementRulesTableLevelCompletion[AchievementType.PLAYER_RANK_GRANDMASTER].unlocked,
  },
  {
    name: DIFFICULTY_PRETTY_NAMES[DIFFICULTY_NAMES.PROFESSOR],
    requirement: AchievementRulesTableLevelCompletion[AchievementType.PLAYER_RANK_PROFESSOR].unlocked,
  },
  {
    name: DIFFICULTY_PRETTY_NAMES[DIFFICULTY_NAMES.PHD],
    requirement: AchievementRulesTableLevelCompletion[AchievementType.PLAYER_RANK_PHD].unlocked,
  },
  {
    name: DIFFICULTY_PRETTY_NAMES[DIFFICULTY_NAMES.MASTERS],
    requirement: AchievementRulesTableLevelCompletion[AchievementType.PLAYER_RANK_MASTERS].unlocked,
  },
  {
    name: DIFFICULTY_PRETTY_NAMES[DIFFICULTY_NAMES.BACHELORS],
    requirement: AchievementRulesTableLevelCompletion[AchievementType.PLAYER_RANK_BACHELORS].unlocked,
  },
  {
    name: DIFFICULTY_PRETTY_NAMES[DIFFICULTY_NAMES.HIGH_SCHOOL],
    requirement: AchievementRulesTableLevelCompletion[AchievementType.PLAYER_RANK_HIGH_SCHOOL].unlocked,
  },
  {
    name: DIFFICULTY_PRETTY_NAMES[DIFFICULTY_NAMES.JUNIOR_HIGH],
    requirement: AchievementRulesTableLevelCompletion[AchievementType.PLAYER_RANK_JUNIOR_HIGH].unlocked,
  },
  {
    name: DIFFICULTY_PRETTY_NAMES[DIFFICULTY_NAMES.ELEMENTARY],
    requirement: AchievementRulesTableLevelCompletion[AchievementType.PLAYER_RANK_ELEMENTARY].unlocked,
  },
  {
    name: DIFFICULTY_PRETTY_NAMES[DIFFICULTY_NAMES.KINDERGARTEN],
    requirement: AchievementRulesTableLevelCompletion[AchievementType.PLAYER_RANK_KINDERGARTEN].unlocked,
  },
];

function getPlayerRank(levelsCompletedByDifficulty: { [key: string]: number }): JSX.Element {
  // TODO: reconcile with AchievementScoreInfo
  // rolling sum should add up all from previous keys into current key
  const rollingSum = getDifficultyRollingSum(levelsCompletedByDifficulty);
  const req = difficultyRequirements.find((difficultyRequirement) => difficultyRequirement.requirement({ rollingLevelCompletionSum: rollingSum }));
  const difficulty = getDifficultyList().find(d => d.name === req?.name);

  if (!difficulty) {
    return <span>No rank</span>;
  }

  return <FormattedDifficulty difficultyEstimate={difficulty.value} id={difficulty.name} />;
}

interface PlayerRankProps {
  levelsCompletedByDifficulty: { [key: string]: number };
  user: User;
}

export default function PlayerRank({ levelsCompletedByDifficulty, user }: PlayerRankProps) {
  return (
    <Link href={'/profile/' + user.name + '/' + ProfileTab.Achievements}>
      {getPlayerRank(levelsCompletedByDifficulty)}
    </Link>
  );
}
