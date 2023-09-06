import { AchievementRulesTableCreator, AchievementRulesTableLevelCompletion, AchievementRulesTableUser, IAchievementInfo } from '@root/constants/achievementInfo';
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

  const creatorAchievements = getAchievementsOfType(AchievementRulesTableCreator);
  const progressAchievements = getAchievementsOfType(AchievementRulesTableLevelCompletion);
  const skillAchievements = getAchievementsOfType(AchievementRulesTableUser);

  return (<div className='flex flex-row gap-8 justify-center'>
    <div className='flex flex-col gap-1'>
      <h1 className='text-2xl font-bold text-center'>Skill</h1>
      <div className='flex flex-col justify-center text-center' >
        {skillAchievements.length > 0 ? skillAchievements : <span className='text-center'>No achievements yet</span>}
      </div>
    </div>
    <div className='flex flex-col gap-1'>
      <h1 className='text-2xl font-bold text-center'>Creator</h1>
      <div className='flex flex-col justify-center text-center' >

        {creatorAchievements.length > 0 ? creatorAchievements : <span className='text-center'>No achievements yet</span>}
      </div>
    </div>

    <div className='flex flex-col gap-1'>
      <h1 className='text-2xl font-bold text-center'>Progress</h1>
      <div className='flex flex-col justify-center text-center' >
        {progressAchievements.length > 0 ? progressAchievements : <span className='text-center'>No achievements yet</span>}
      </div>
    </div>
  </div>

  );
}
