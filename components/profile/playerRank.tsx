import { skillRequirements } from '@root/constants/achievements/AchievementRulesSkill';
import { getDifficultyRollingSum } from '@root/helpers/playerRankHelper';
import User from '@root/models/db/user';
import { ProfileTab } from '@root/pages/[subdomain]/profile/[name]/[[...tab]]';
import Link from 'next/link';
import React from 'react';
import FormattedDifficulty, { difficultyList } from '../formatted/formattedDifficulty';

function getPlayerRank(levelsSolvedByDifficulty?: { [key: string]: number }) {
  if (!levelsSolvedByDifficulty) {
    return null;
  }

  const rollingSum = getDifficultyRollingSum(levelsSolvedByDifficulty);

  // find the highest unlocked skill requirement
  const req = skillRequirements.find(skillRequirement => {
    return rollingSum[skillRequirement.difficultyIndex] >= skillRequirement.levels;
  });

  if (!req) {
    return null;
  }

  const difficulty = difficultyList[req.difficultyIndex];

  return <FormattedDifficulty difficulty={difficulty} id='player-rank' />;
}

interface PlayerRankProps {
  levelsSolvedByDifficulty: { [key: string]: number };
  user: User;
}

export default function PlayerRank({ levelsSolvedByDifficulty, user }: PlayerRankProps) {
  return (
    <Link href={'/profile/' + user.name + '/' + ProfileTab.Achievements}>
      {getPlayerRank(levelsSolvedByDifficulty) ?? <span>No rank</span>}
    </Link>
  );
}
