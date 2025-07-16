import { skillRequirements } from '@root/constants/achievements/AchievementRulesSkill';
import { getDifficultyRollingSum } from '@root/helpers/playerRankHelper';
import User from '@root/models/db/user';
import { ProfileTab } from '@root/pages/[subdomain]/profile/[name]/[[...tab]]';
import Link from 'next/link';
import FormattedDifficulty, { difficultyList } from '../formatted/formattedDifficulty';

function getPlayerRank(levelsSolvedByDifficulty?: { [key: string]: number }, tooltip?: string) {
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

  return <FormattedDifficulty difficulty={difficulty} id='player-rank' tooltip={tooltip} />;
}

interface PlayerRankProps {
  levelsSolvedByDifficulty: { [key: string]: number };
  tooltip?: string;
  user: User;
}

export default function PlayerRank({ levelsSolvedByDifficulty, tooltip, user }: PlayerRankProps) {
  return (
    <Link href={'/profile/' + user.name + '/' + ProfileTab.Achievements}>
      {getPlayerRank(levelsSolvedByDifficulty, tooltip) ?? <span>No rank</span>}
    </Link>
  );
}
