import { AchievementRulesCombined, AchievementRulesTableCreator, AchievementRulesTableLevelCompletion, AchievementRulesTableUser } from '@root/constants/achievementInfo';
import Achievement from '@root/models/db/achievement';
import React from 'react';
import FormattedAchievement from '../formatted/formattedAchievement';

export function ProfileAchievments({ achievements }: { achievements: Achievement[] }) {
  return (<div className='flex flex-row gap-2 justify-center'>
    <div className='flex flex-col gap-1'>
      <h1 className='text-2xl font-bold text-center'>Creator</h1>
      <div className='flex flex-col justify-center text-center p-1' >
        {Object.keys(AchievementRulesTableCreator).map(achievementType => {
          const achievement = achievements.find(achievement => achievement.type === achievementType);

          if (!achievement) {
            return null;
          }

          return <div key={`achievement-${achievement._id}`} className='p-3'><FormattedAchievement achievement={achievement} /></div>;
        })}
      </div>
    </div>
    <div className='flex flex-col gap-1'>
      <h1 className='text-2xl font-bold text-center'>Progress</h1>
      <div className='flex flex-col justify-center text-center' >
        {Object.keys(AchievementRulesTableUser).map(achievementType => {
          const achievement = achievements.find(achievement => achievement.type === achievementType);

          if (!achievement) {
            return null;
          }

          return <div key={`achievement-${achievement._id}`} className='p-3'><FormattedAchievement achievement={achievement} /></div>;
        })}
      </div>
    </div>

    <div className='flex flex-col gap-1'>
      <h1 className='text-2xl font-bold text-center'>Skill</h1>
      <div className='flex flex-col justify-center text-center' >
        {Object.keys(AchievementRulesTableLevelCompletion).map(achievementType => {
          const achievement = achievements.find(achievement => achievement.type === achievementType);

          if (!achievement) {
            return null;
          }

          return <div key={`achievement-${achievement._id}`} className='p-3'><FormattedAchievement achievement={achievement} /></div>;
        })}
      </div>
    </div>

  </div>

  );
}
