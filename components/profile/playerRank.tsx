import { skillRequirements } from '@root/constants/achievements/AchievementRulesSkill';
import { getDifficultyRollingSum } from '@root/helpers/playerRankHelper';
import User from '@root/models/db/user';
import { ProfileTab } from '@root/pages/profile/[name]/[[...tab]]';
import Link from 'next/link';
import React from 'react';
import FormattedDifficulty, { difficultyList } from '../formatted/formattedDifficulty';

function getPlayerRank(levelsCompletedByDifficulty: { [key: string]: number }): JSX.Element {
  const rollingSum = getDifficultyRollingSum(levelsCompletedByDifficulty);

  // find the highest unlocked skill requirement
  const req = skillRequirements.find(skillRequirement => {
    return rollingSum[skillRequirement.difficultyIndex] >= skillRequirement.levels;
  });

  if (!req) {
    return <span>No rank</span>;
  }

  const difficulty = difficultyList[req.difficultyIndex];

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
