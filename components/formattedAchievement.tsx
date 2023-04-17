import Image from 'next/image';
import React from 'react';
import AchievementInfo from '../constants/achievementInfo';
import Achievement from '../models/db/achievement';
import FormattedDate from './formattedDate';

interface FormattedAchievementProps {
  achievement: Achievement;
}

export default function FormattedAchievement({ achievement }: FormattedAchievementProps) {
  return (
    <div className='flex flex-col justify-center text-center' style={{
      borderColor: 'var(--bg-color-4)',
    }}>
      <Image alt='logo' src='/logo.svg' width='32' height='32' className='h-12 w-full mb-2' />
      <span>{AchievementInfo[achievement.type].description}</span>
      <FormattedDate date={achievement.createdAt} />
    </div>
  );
}
