import { GameId } from '@root/constants/GameId';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import { getStreak } from '@root/lib/cleanUser';
import UserConfig from '@root/models/db/userConfig';
import { useRouter } from 'next/navigation';
import { getStreakRankIndex, STREAK_RANK_GROUPS } from '../counters/AnimateCounterOne';
import GameLogo from '../gameLogo';

interface StreakSectionProps {
  gameId: GameId;
  userConfig?: UserConfig;
  hideHeader?: boolean;
  compact?: boolean;
}

export default function StreakSection({ gameId, userConfig, hideHeader, compact }: StreakSectionProps) {
  const game = getGameFromId(gameId);
  const router = useRouter();
  const { streak, timeToKeepStreak } = userConfig ? getStreak(userConfig) : { streak: 0, timeToKeepStreak: 0 };
  const streakRank = STREAK_RANK_GROUPS[getStreakRankIndex(streak)];
  const nextRank = STREAK_RANK_GROUPS[getStreakRankIndex(streak) + 1];

  // Calculate hasPlayedToday using same logic as getStreak
  const hasPlayedToday = (() => {
    if (!userConfig?.lastPlayedAt) return false;

    // Use UTC to avoid timezone issues
    const today = new Date();

    today.setUTCHours(0, 0, 0, 0);
    const lastPlayedAt = new Date(userConfig.lastPlayedAt);

    return lastPlayedAt.getTime() >= today.getTime();
  })();

  // Calculate progress to next rank if there is one
  const progressPercent = nextRank ? Math.min(
    ((streak - streakRank.min) / (nextRank.min - streakRank.min)) * 100,
    100
  ) : 100;

  if (compact) {
    return (
      <div className='flex flex-col w-full'>
        {!hideHeader && <h4 className='font-medium text-sm text-gray-500 dark:text-gray-400'>Streak</h4>}
        <div
          onClick={() => {
            const game = getGameFromId(gameId);

            router.push(`${game.baseUrl}/search`);
          }}
          className={`
            cursor-pointer w-full rounded-lg overflow-hidden transition-all duration-300
            hover:shadow-md hover:scale-[1.01]
          `}
        >
          {!hideHeader && (
            <div className='bg-gradient-to-r from-purple-600 to-blue-600 p-2 text-white'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <GameLogo gameId={gameId} id={gameId + '-streak'} size={16} />
                  <span className='font-medium text-sm'>{game.displayName} Streak</span>
                </div>
                <div className='bg-white/20 px-2 py-0.5 rounded-full text-sm font-medium'>
                  {streak} day{streak === 1 ? '' : 's'}
                </div>
              </div>
            </div>
          )}
          <div className={hideHeader ? 'p-0' : 'bg-white dark:bg-gray-800 p-2'}>
            {streak === 0 ? (
              <div className={hideHeader ? 'flex flex-col items-center text-center text-white/80' : 'flex items-center justify-between text-sm'}>
                <span className={hideHeader ? 'text-base mb-2' : ''}>Start your streak today!</span>
                <span className={hideHeader ? 'text-2xl' : ''}>🎯</span>
              </div>
            ) : (
              <div className={hideHeader ? 'flex flex-col gap-3' : 'flex items-center justify-between'}>
                <div className={hideHeader ? 'flex items-center justify-between' : 'flex items-center gap-2'}>
                  <div className='flex items-center gap-2'>
                    <span className={hideHeader ? 'text-2xl' : 'text-lg'}>{streakRank.emoji}</span>
                    <span className={hideHeader ? 'text-base font-semibold text-white' : 'text-sm font-medium'}>{streakRank.title}</span>
                  </div>
                  {hideHeader && (
                    <div className={`text-sm font-medium ${!hasPlayedToday && streak > 0 && timeToKeepStreak > 0 ? 'text-yellow-300' : 'text-green-300'}`}>
                      {!hasPlayedToday && streak > 0 && timeToKeepStreak > 0
                        ? `Play within ${Math.ceil(timeToKeepStreak / (1000 * 60 * 60))}h`
                        : hasPlayedToday
                          ? 'Played today! 🌟'
                          : 'Start streak!'}
                    </div>
                  )}
                </div>
                {hideHeader && nextRank && (
                  <div className='space-y-2'>
                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-white/80'>Next: {nextRank.title}</span>
                      <span className='text-white/70'>{nextRank.min - streak} days to go</span>
                    </div>
                    <div className='w-full bg-white/20 rounded-full h-2'>
                      <div
                        className='bg-gradient-to-r from-cyan-400 to-blue-400 h-2 rounded-full transition-all duration-300'
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
                {!hideHeader && (
                  <div className={`text-xs font-medium ${!hasPlayedToday && streak > 0 && timeToKeepStreak > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                    {!hasPlayedToday && streak > 0 && timeToKeepStreak > 0
                      ? `Play within ${Math.ceil(timeToKeepStreak / (1000 * 60 * 60))}h`
                      : hasPlayedToday
                        ? 'Played today! 🌟'
                        : 'Start streak!'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col w-full'>
      {!hideHeader && <h4 className='font-medium text-sm text-gray-500 dark:text-gray-400'>Streak</h4>}
      <div
        onClick={() => {
          const game = getGameFromId(gameId);

          router.push(`${game.baseUrl}/search`);
        }}
        className={`
          cursor-pointer w-full rounded-xl overflow-hidden transition-all duration-300
          ${!hasPlayedToday && streak > 0
      ? 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-200/50 hover:shadow-xl hover:scale-[1.02]'
      : 'hover:shadow-md hover:scale-[1.01]'}
        `}
      >
        <div className='bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <GameLogo gameId={gameId} id={gameId + '-streak'} size={16} />
              <span className='font-medium'>{game.displayName} Streak</span>
            </div>
            <div className='bg-white/20 px-3 py-1 rounded-full text-sm font-medium'>
              {streak} day{streak === 1 ? '' : 's'}
            </div>
          </div>
        </div>
        <div className='bg-white dark:bg-gray-800 p-4'>
          {streak === 0 ? (
            <div className='flex flex-col items-center text-center py-2'>
              <div className='text-3xl mb-2'>🎯</div>
              <div className='text-lg font-medium mb-1'>Start your streak today!</div>
              <div className='text-sm text-gray-500 dark:text-gray-400'>
                Play daily to build your streak and earn achievements
              </div>
            </div>
          ) : (
            <div className='flex flex-col gap-3'>
              <div className='flex items-center gap-3'>
                <div className='bg-purple-100 dark:bg-purple-900 p-3 rounded-full'>
                  <span className='text-2xl'>{streakRank.emoji}</span>
                </div>
                <div>
                  <div className='font-medium text-left'>{streakRank.title}</div>
                  {nextRank && (
                    <div className='text-sm text-gray-500 dark:text-gray-400'>
                      Next rank: {nextRank.title}
                    </div>
                  )}
                </div>
              </div>
              {nextRank && (
                <div className='space-y-1'>
                  <div className='h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden'>
                    <div
                      className='h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500'
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className='flex justify-between text-xs text-gray-500 dark:text-gray-400'>
                    <span>{streak} days</span>
                    <span>{nextRank.min} days</span>
                  </div>
                </div>
              )}
              <div className={`text-sm font-medium mt-1 ${!hasPlayedToday && streak > 0 && timeToKeepStreak > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                {!hasPlayedToday && streak > 0 && timeToKeepStreak > 0
                  ? `Play within ${Math.ceil(timeToKeepStreak / (1000 * 60 * 60))} hours to keep your streak! 🔥`
                  : hasPlayedToday
                    ? 'You\'ve played today! Keep it up! 🌟'
                    : 'Ready to start your streak!'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
