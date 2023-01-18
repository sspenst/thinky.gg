import Image from 'next/image';
import React from 'react';
import AchievementInfo from '../constants/achievementInfo';
import getFormattedDate from '../helpers/getFormattedDate';
import Achievement from '../models/db/achievement';

interface FormattedAchievementProps {
  achievement: Achievement;
}

export default function FormattedAchievement({ achievement }: FormattedAchievementProps) {
  return (
    <div className='flex flex-col justify-center' style={{
      borderColor: 'var(--bg-color-4)',
    }}>
      <Image alt='logo' src='/logo.svg' width='32' height='32' className='h-12 w-full mb-2' />
      <span>{AchievementInfo[achievement.type].description}</span>
      <span className='text-sm' style={{
        color: 'var(--color-gray)',
      }}>{getFormattedDate(new Date(achievement.createdAt).getTime() / 1000)}</span>
    </div>
  );
}
