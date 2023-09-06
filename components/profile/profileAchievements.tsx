import { AchievementRulesTableCreator, AchievementRulesTableLevelCompletion, AchievementRulesTableReviewer, AchievementRulesTableUser, IAchievementInfo } from '@root/constants/achievementInfo';
import Achievement from '@root/models/db/achievement';
import React from 'react';
import FormattedAchievement from '../formatted/formattedAchievement';

export function ProfileAchievments({ achievements }: { achievements: Achievement[] }) {
  function getAchievementsOfType(rule: any) {
    return Object.keys(rule).map(achievementType => {
      const achievement = achievements.find(achievement => achievement.type === achievementType);

      if (!achievement) {
        return null;
      }

      return <div key={`achievement-${achievement._id}`} className='p-3'><FormattedAchievement achievement={achievement} /></div>;
    }).filter(achievement => achievement !== null).reverse();
  }

  const achievementsToShow = {
    'Skill': getAchievementsOfType(AchievementRulesTableUser),
    'Creator': getAchievementsOfType(AchievementRulesTableCreator),
    'Progress': getAchievementsOfType(AchievementRulesTableLevelCompletion),
    'Reviewer': getAchievementsOfType(AchievementRulesTableReviewer)

  } as { [key: string]: JSX.Element[] };

  return (
    <div className='flex flex-row gap-8 justify-center'>

      {Object.keys(achievementsToShow).map((achievementType) => (
        <div className='flex flex-col gap-1' key={achievementType}>
          <h1 className='text-2xl font-bold text-center'>{achievementType}</h1>
          <div className='flex flex-col justify-center text-center' >
            {achievementsToShow[achievementType].length > 0 ? achievementsToShow[achievementType] : (<span className='text-center'>No achievements yet</span>)}
          </div>
        </div>
      ))
      }

    </div>
  );
}
