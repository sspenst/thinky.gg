import { AchievementRulesCombined } from '@root/constants/achievements/achievementInfo';
import AchievementType from '@root/constants/achievements/achievementType';
import classNames from 'classnames';
import { ObjectId } from 'mongoose';
import { useRouter } from 'next/router';
import React from 'react';
import StyledTooltip from '../page/styledTooltip';
import FormattedDate from './formattedDate';

interface FormattedAchievementProps {

  achievementType: AchievementType;
  createdAt?: Date;
  unlocked?: boolean;
}

export default function FormattedAchievement({ achievementType, createdAt, unlocked }: FormattedAchievementProps) {
  const locked = !createdAt && !unlocked;
  const achievement = AchievementRulesCombined[achievementType];
  const router = useRouter();

  return (
    <div

      onClick={() => {
        router.push(`/achievement/${achievementType}`);
      }}
      className={classNames('cursor-pointer flex gap-4 items-center rounded-xl', { 'opacity-30': locked })}
      style={{
        borderColor: 'var(--bg-color-4)',
      }}
    >
      <span className='text-4xl'>{achievement.emoji}</span>
      <div className='flex flex-col'>
        <span className='font-bold text-lg'>{achievement.name}</span>
        <span
          className='text-sm'
          data-tooltip-content={achievement.tooltip}
          data-tooltip-id={`achievement-description-${achievementType}`}
        >
          {achievement.description}
        </span>
        {achievement.tooltip && <StyledTooltip id={`achievement-description-${achievementType}`} />}
        {!locked && <FormattedDate className='w-fit' date={createdAt} />}
      </div>
    </div>
  );
}
