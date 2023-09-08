import { AchievementRulesCombined } from '@root/constants/achievements/achievementInfo';
import AchievementType from '@root/constants/achievements/achievementType';
import classNames from 'classnames';
import React from 'react';
import FormattedDate from './formattedDate';

interface FormattedAchievementProps {
  achievementType: AchievementType;
  createdAt?: Date;
}

export default function FormattedAchievement({ achievementType, createdAt }: FormattedAchievementProps) {
  const locked = !createdAt;

  return (
    <div
      className={classNames('flex gap-4 items-center rounded-xl', { 'opacity-30': locked })}
      style={{
        borderColor: 'var(--bg-color-4)',
      }}
    >
      <span className='text-4xl'>{AchievementRulesCombined[achievementType].emoji}</span>
      <div className='flex flex-col'>
        <span className='font-bold text-lg'>{AchievementRulesCombined[achievementType].name}</span>
        <span className='text-sm'>{AchievementRulesCombined[achievementType].description}</span>
        {!locked && <FormattedDate date={createdAt} />}
      </div>
    </div>
  );
}
