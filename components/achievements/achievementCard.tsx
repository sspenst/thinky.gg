import { AchievementRulesCombined } from '@root/constants/achievements/achievementInfo';
import AchievementType from '@root/constants/achievements/achievementType';
import { Game } from '@root/constants/Games';
import Achievement from '@root/models/db/achievement';
import classNames from 'classnames';
import Link from 'next/link';
import FormattedDate from '../formatted/formattedDate';
import StyledTooltip from '../page/styledTooltip';

interface AchievementCardProps {
  achievementType: AchievementType;
  isUnlocked: boolean;
  achievement?: Achievement;
  game: Game;
  viewMode: 'grid' | 'list';
  stats?: {
    count: number;
    firstEarned: Date;
    lastEarned: Date;
  };
}

export default function AchievementCard({
  achievementType,
  isUnlocked,
  achievement,
  game,
  viewMode,
  stats,
}: AchievementCardProps) {
  const achievementInfo = AchievementRulesCombined[achievementType];

  if (!achievementInfo) {
    return null;
  }

  // Don't show secret achievements if they're locked
  if (achievementInfo.secret && !isUnlocked) {
    return null;
  }

  const glowingBorderCSS = {
    boxShadow: '0 0 10px 2px rgba(255, 100, 0, 0.6), 0 0 20px 2px rgba(255, 150, 0, 0.7), 0 0 8px 4px rgba(255, 200, 0, 0.8)',
  };

  const getRarityColor = () => {
    if (!stats) return 'text-gray-500';
    const percentage = (stats.count / 1000) * 100; // Assuming 1000+ players for rough percentage

    if (percentage < 1) return 'text-purple-500'; // Legendary
    if (percentage < 5) return 'text-orange-500'; // Epic
    if (percentage < 15) return 'text-blue-500'; // Rare
    if (percentage < 40) return 'text-green-500'; // Uncommon

    return 'text-gray-500'; // Common
  };

  const getRarityText = () => {
    if (!stats) return 'Unknown';
    const percentage = (stats.count / 1000) * 100;

    if (percentage < 1) return 'Legendary';
    if (percentage < 5) return 'Epic';
    if (percentage < 15) return 'Rare';
    if (percentage < 40) return 'Uncommon';

    return 'Common';
  };

  if (viewMode === 'list') {
    return (
      <Link
        href={`/achievement/${achievementType}`}
        className={classNames(
          'flex items-center gap-4 p-4 rounded-lg border border-color-4 hover:border-color-5 transition-all group',
          {
            'opacity-50': !isUnlocked,
            'bg-3 hover:bg-4': !isUnlocked,
            'bg-gradient-to-r from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20': isUnlocked,
          }
        )}
        style={achievementInfo.secret ? glowingBorderCSS : {}}
      >
        <div className='text-3xl flex-shrink-0'>{achievementInfo.emoji}</div>
        
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 mb-1'>
            <h3 className='font-bold text-lg truncate'>{achievementInfo.name}</h3>
            {achievementInfo.secret && isUnlocked && (
              <span className='text-xs px-2 py-1 bg-orange-500 text-white rounded-full'>SECRET</span>
            )}
            {isUnlocked && (
              <span className='text-xs px-2 py-1 bg-green-500 text-white rounded-full'>✓</span>
            )}
          </div>
          <p className='text-sm opacity-75 truncate'>{achievementInfo.getDescription(game)}</p>
        </div>
        <div className='flex flex-col items-end gap-1 text-sm'>
          {isUnlocked && achievement && (
            <FormattedDate className='text-xs opacity-75' date={achievement.createdAt} />
          )}
          {stats && (
            <div className={`text-xs font-semibold ${getRarityColor()}`}>
              {getRarityText()}
            </div>
          )}
          {stats && (
            <div className='text-xs opacity-50'>
              {stats.count} earned
            </div>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/achievement/${achievementType}`}
      className={classNames(
        'group block rounded-xl border border-color-4 hover:border-color-5 transition-all transform hover:scale-105 overflow-hidden',
        {
          'opacity-60': !isUnlocked,
          'bg-3 hover:bg-4': !isUnlocked,
          'bg-gradient-to-br from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20': isUnlocked,
        }
      )}
      style={achievementInfo.secret ? glowingBorderCSS : {}}
    >
      <div className='p-4 space-y-3'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div className='text-4xl'>{achievementInfo.emoji}</div>
          <div className='flex flex-col items-end gap-1'>
            {achievementInfo.secret && isUnlocked && (
              <span className='text-xs px-2 py-1 bg-orange-500 text-white rounded-full'>SECRET</span>
            )}
            {isUnlocked && (
              <div className='w-6 h-6 bg-green-500 rounded-full flex items-center justify-center'>
                <span className='text-white text-xs font-bold'>✓</span>
              </div>
            )}
          </div>
        </div>
        {/* Title and Description */}
        <div>
          <h3 className='font-bold text-lg mb-1 group-hover:text-blue-500 transition-colors'>
            {achievementInfo.name}
          </h3>
          <p
            className='text-sm opacity-75 line-clamp-2'
            data-tooltip-content={achievementInfo.tooltip}
            data-tooltip-id={`achievement-tooltip-${achievementType}`}
          >
            {achievementInfo.getDescription(game)}
          </p>
          {achievementInfo.tooltip && (
            <StyledTooltip id={`achievement-tooltip-${achievementType}`} />
          )}
        </div>
        {/* Footer */}
        <div className='pt-2 border-t border-color-4 space-y-2'>
          {isUnlocked && achievement && (
            <div className='text-xs opacity-75'>
              Earned: <FormattedDate date={achievement.createdAt} />
            </div>
          )}
          
          {stats && (
            <div className='flex justify-between items-center text-xs'>
              <span className={`font-semibold ${getRarityColor()}`}>
                {getRarityText()}
              </span>
              <span className='opacity-50'>
                {stats.count} players
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
