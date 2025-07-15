import { AchievementRulesCombined } from '@root/constants/achievements/achievementInfo';
import AchievementType from '@root/constants/achievements/achievementType';
import { GameId } from '@root/constants/GameId';
import { Game, Games } from '@root/constants/Games';
import { getRarityFromStats, getRarityText, getRarityColor, getRarityTooltip } from '@root/helpers/achievementRarity';
import Achievement from '@root/models/db/achievement';
import classNames from 'classnames';
import Image from 'next/image';
import Link from 'next/link';
import FormattedDate from '../formatted/formattedDate';
import StyledTooltip from '../page/styledTooltip';

interface AchievementCardProps {
  achievementType: AchievementType;
  gameAchievements: Achievement[];
  allGames: GameId[];
  game: Game;
  viewMode: 'grid' | 'list';
  statsMap: Map<string, { count: number; firstEarned: Date; lastEarned: Date; gameId: GameId }>;
  selectedGame: GameId | 'all';
  userAchievementsByGame: Record<GameId, Achievement[]>;
}

export default function AchievementCard({
  achievementType,
  gameAchievements,
  allGames,
  game,
  viewMode,
  statsMap,
  selectedGame,
  userAchievementsByGame,
}: AchievementCardProps) {
  const achievementInfo = AchievementRulesCombined[achievementType];

  if (!achievementInfo) {
    return null;
  }

  // Check if unlocked in any game or specific game
  const isUnlockedInAnyGame = gameAchievements.length > 0;
  const isUnlockedInSelectedGame = selectedGame === 'all'
    ? isUnlockedInAnyGame
    : gameAchievements.some(ach => ach.gameId === selectedGame);

  const isUnlocked = selectedGame === 'all' ? isUnlockedInAnyGame : isUnlockedInSelectedGame;
  const relevantAchievement = selectedGame === 'all'
    ? gameAchievements[0] // Show first achievement if showing all games
    : gameAchievements.find(ach => ach.gameId === selectedGame);

  // Don't show secret achievements if they're locked
  if (achievementInfo.secret && !isUnlocked) {
    return null;
  }

  const glowingBorderCSS = {
    boxShadow: '0 0 10px 2px rgba(255, 100, 0, 0.6), 0 0 20px 2px rgba(255, 150, 0, 0.7), 0 0 8px 4px rgba(255, 200, 0, 0.8)',
  };

  // Get combined stats for this achievement across relevant games
  const getCombinedStats = () => {
    if (selectedGame === 'all') {
      // Combine stats from all games
      let totalCount = 0;
      let earliestDate: Date | null = null;
      let latestDate: Date | null = null;

      allGames.forEach(gameId => {
        const key = `${achievementType}-${gameId}`;
        const stat = statsMap.get(key);

        if (stat) {
          totalCount += stat.count;

          if (!earliestDate || stat.firstEarned < earliestDate) {
            earliestDate = stat.firstEarned;
          }

          if (!latestDate || stat.lastEarned > latestDate) {
            latestDate = stat.lastEarned;
          }
        }
      });

      return totalCount > 0 ? {
        count: totalCount,
        firstEarned: earliestDate!,
        lastEarned: latestDate!
      } : null;
    } else {
      // Get stats for specific game
      const key = `${achievementType}-${selectedGame}`;

      return statsMap.get(key) || null;
    }
  };

  const stats = getCombinedStats();

  const rarity = stats ? getRarityFromStats(stats.count) : null;
  const rarityText = rarity ? getRarityText(rarity) : 'Unknown';
  const rarityColor = rarity ? getRarityColor(rarity) : 'text-gray-500';
  const rarityTooltip = rarity ? getRarityTooltip(rarity) : 'Rarity unknown';

  // Render game logos for earned achievements (only if showing all games and not social category)
  const renderGameLogos = () => {
    if (selectedGame !== 'all' || allGames.includes(GameId.THINKY)) {
      return null; // Don't show game logos for social achievements or when filtering by specific game
    }

    const earnedGames = gameAchievements.map(ach => ach.gameId);

    return (
      <div className='flex gap-1 mt-2'>
        {allGames.map(gameId => {
          const isEarnedInGame = earnedGames.includes(gameId);
          const gameInfo = Games[gameId];

          return (
            <div
              key={gameId}
              className={classNames(
                'w-6 h-6 rounded border-2 flex items-center justify-center',
                {
                  'border-green-500 bg-green-500/20': isEarnedInGame,
                  'border-gray-400 bg-gray-400/10 opacity-50': !isEarnedInGame,
                }
              )}
              title={isEarnedInGame ? `Earned in ${gameInfo.displayName}` : `Not earned in ${gameInfo.displayName}`}
            >
              <Image
                src={gameInfo.logoPng}
                alt={gameInfo.displayName}
                width={16}
                height={16}
                className={classNames('rounded', {
                  'opacity-100': isEarnedInGame,
                  'opacity-30': !isEarnedInGame
                })}
              />
            </div>
          );
        })}
      </div>
    );
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
              <span 
                className='text-xs px-2 py-1 bg-orange-500 text-white rounded-full'
                data-tooltip-content="Secret achievement - rare and special!"
                data-tooltip-id={`secret-tooltip-${achievementType}-list`}
              >
                SECRET
                <StyledTooltip id={`secret-tooltip-${achievementType}-list`} />
              </span>
            )}
            {isUnlocked && (
              <span 
                className='text-xs px-2 py-1 bg-green-500 text-white rounded-full'
                data-tooltip-content="You unlocked this achievement"
                data-tooltip-id={`unlocked-tooltip-${achievementType}-list`}
              >
                ✓
                <StyledTooltip id={`unlocked-tooltip-${achievementType}-list`} />
              </span>
            )}
          </div>
          <p className='text-sm opacity-75 truncate'>{achievementInfo.getDescription(game)}</p>
        </div>
        <div className='flex flex-col items-end gap-1 text-sm'>
          {isUnlocked && relevantAchievement && (
            <FormattedDate className='text-xs opacity-75' date={relevantAchievement.createdAt} />
          )}
          {renderGameLogos()}
          {stats && (
            <div 
              className={`text-xs font-semibold ${rarityColor}`}
              data-tooltip-content={rarityTooltip}
              data-tooltip-id={`rarity-tooltip-${achievementType}-list`}
            >
              {rarityText}
              <StyledTooltip id={`rarity-tooltip-${achievementType}-list`} />
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
              <span 
                className='text-xs px-2 py-1 bg-orange-500 text-white rounded-full'
                data-tooltip-content="Secret achievement - rare and special!"
                data-tooltip-id={`secret-tooltip-${achievementType}-grid`}
              >
                SECRET
                <StyledTooltip id={`secret-tooltip-${achievementType}-grid`} />
              </span>
            )}
            {isUnlocked && (
              <div 
                className='w-6 h-6 bg-green-500 rounded-full flex items-center justify-center'
                data-tooltip-content="You unlocked this achievement"
                data-tooltip-id={`unlocked-tooltip-${achievementType}-grid`}
              >
                <span className='text-white text-xs font-bold'>✓</span>
                <StyledTooltip id={`unlocked-tooltip-${achievementType}-grid`} />
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
          {isUnlocked && relevantAchievement && (
            <div className='text-xs opacity-75'>
              Earned: <FormattedDate date={relevantAchievement.createdAt} />
            </div>
          )}
          {renderGameLogos()}
          
          {stats && (
            <div className='flex justify-between items-center text-xs'>
              <span 
                className={`font-semibold ${rarityColor}`}
                data-tooltip-content={rarityTooltip}
                data-tooltip-id={`rarity-tooltip-${achievementType}-grid`}
              >
                {rarityText}
                <StyledTooltip id={`rarity-tooltip-${achievementType}-grid`} />
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
