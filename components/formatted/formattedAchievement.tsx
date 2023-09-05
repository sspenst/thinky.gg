import { AchievementRulesCombined } from '@root/constants/achievementInfo';
import React from 'react';
import Achievement from '../../models/db/achievement';
import FormattedDate from './formattedDate';

interface FormattedAchievementProps {
  achievement: Achievement;
}

export default function FormattedAchievement({ achievement }: FormattedAchievementProps) {
  // merge all the achievement rules into one object

  return (
    <div className='flex flex-col justify-center text-center' style={{
      borderColor: 'var(--bg-color-4)',
    }}>
      <span className='text-4xl'>{AchievementRulesCombined[achievement.type].emoji}</span>
      <div className='flex flex-col justify-center items-center'>
        <span className='font-bold text-lg'>{AchievementRulesCombined[achievement.type].name}</span>

        <span className='text-sm'>{AchievementRulesCombined[achievement.type].description}</span>
      </div>
      <FormattedDate date={achievement.createdAt} />
    </div>
  );
}
