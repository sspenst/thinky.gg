import React from 'react';
import AchievementRulesTable from '../../constants/achievementInfo';
import Achievement from '../../models/db/achievement';
import FormattedDate from './formattedDate';

interface FormattedAchievementProps {
  achievement: Achievement;
}

export default function FormattedAchievement({ achievement }: FormattedAchievementProps) {
  return (
    <div className='flex flex-col justify-center text-center' style={{
      borderColor: 'var(--bg-color-4)',
    }}>
      <span className='text-4xl'>{AchievementRulesTable[achievement.type].emoji}</span>
      <div className='flex flex-col justify-center items-center'>
        <span className='font-bold text-lg'>{AchievementRulesTable[achievement.type].name}</span>

        <span className='text-sm'>{AchievementRulesTable[achievement.type].description}</span>
      </div>
      <FormattedDate date={achievement.createdAt} />
    </div>
  );
}
