import { AchievementRulesCombined } from '@root/constants/achievements/achievementInfo';
import AchievementType from '@root/constants/achievements/achievementType';
import { Game } from '@root/constants/Games';
import classNames from 'classnames';
import Link from 'next/link';
import React from 'react';
import StyledTooltip from '../page/styledTooltip';
import FormattedDate from './formattedDate';

interface FormattedAchievementProps {
  achievementType: AchievementType;
  createdAt?: Date;
  game: Game;
  unlocked?: boolean;
}

export default function FormattedAchievement({ achievementType, createdAt, game, unlocked }: FormattedAchievementProps) {
  const locked = !createdAt && !unlocked;
  const achievement = AchievementRulesCombined[achievementType];

  if (achievement.secret && locked) {
    return null;
  }

  const glowingBorderCSS = {
    boxShadow: '0 0 10px 2px rgba(255, 100, 0, 0.6), 0 0 20px 2px rgba(255, 150, 0, 0.7), 0 0 8px 4px rgba(255, 200, 0, 0.8)',
    padding: '4px',
  };
  const achievementTooltipStyle: React.CSSProperties = {
    maxWidth: 'min(16rem, calc(100vw - 0.7rem))',
    whiteSpace: 'normal',
  };

  return (
    <Link
      className={classNames('flex max-w-full gap-4 items-center rounded-xl', { 'opacity-30': locked })}
      href={`/achievement/${achievementType}`}
      style={{
        borderColor: 'var(--bg-color-4)',
        // add a firelike glowing border if achievement.secret is true
        ...(achievement.secret ? glowingBorderCSS : {}),
      }}
    >
      <span className='text-4xl shrink-0'>{achievement.emoji}</span>
      <div className='flex min-w-0 flex-1 flex-col'>
        <div className='flex min-w-0 flex-wrap items-center gap-2'>
          <span className='font-bold text-lg line-clamp-2 break-words'>{achievement.name}</span>
          {achievement.secret && !locked && (
            <span
              className='text-xs px-2 py-1 bg-orange-500 text-white rounded-full shrink-0'
              data-tooltip-content='Secret achievement - rare and special!'
              data-tooltip-id={`secret-tooltip-${achievementType}`}
            >
              SECRET
              <StyledTooltip id={`secret-tooltip-${achievementType}`} />
            </span>
          )}
          {!locked && (
            <span
              className='text-xs px-2 py-1 bg-green-500 text-white rounded-full shrink-0'
              data-tooltip-content='You unlocked this achievement'
              data-tooltip-id={`unlocked-tooltip-${achievementType}`}
            >
              ✓ UNLOCKED
              <StyledTooltip id={`unlocked-tooltip-${achievementType}`} />
            </span>
          )}
          {locked && (
            <span className='text-xs px-2 py-1 bg-gray-500 text-white rounded-full shrink-0'>
              🔒 Not Met
            </span>
          )}
        </div>
        <span
          className='text-sm line-clamp-2 break-words'
          data-tooltip-content={achievement.tooltip}
          data-tooltip-id={`achievement-description-${achievementType}`}
        >
          {achievement.getDescription(game)}
        </span>
        {achievement.tooltip && <StyledTooltip id={`achievement-description-${achievementType}`} style={achievementTooltipStyle} />}
        {!locked && <FormattedDate className='w-fit' date={createdAt} />}
        {locked && (
          <span className='text-sm text-orange-400 font-medium mt-1'>
            Complete this challenge to unlock the achievement!
          </span>
        )}
      </div>
    </Link>
  );
}
