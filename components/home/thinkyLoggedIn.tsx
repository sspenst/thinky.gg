// Optionally import the CSS
import 'cal-heatmap/cal-heatmap.css';
import { GameId } from '@root/constants/GameId';
import { Game, Games } from '@root/constants/Games';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import useSWRHelper from '@root/hooks/useSWRHelper';
import useUrl from '@root/hooks/useUrl';
import { getStreak } from '@root/lib/cleanUser';
import Level from '@root/models/db/level';
import User from '@root/models/db/user';
import UserConfig from '@root/models/db/userConfig';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';
import ChapterSelectCard, { ChapterSelectCardBase } from '../cards/chapterSelectCard';
import { getStreakRankIndex, STREAK_RANK_GROUPS } from '../counters/AnimateCounterOne';
import FormattedUser from '../formatted/formattedUser';
import GameLogo from '../gameLogo';
import LoadingSpinner from '../page/loadingSpinner';
import MultiSelectUser from '../page/multiSelectUser';
import { StreakCalendar } from './streakCalendar';

interface StreakDisplayProps {
  streak: number;
  timeToKeepStreak: number;
  gameId: GameId;
  userConfig?: UserConfig;
}

function StreakDisplay({ streak, timeToKeepStreak, gameId, userConfig }: StreakDisplayProps) {
  const streakRank = STREAK_RANK_GROUPS[getStreakRankIndex(streak)];
  const nextRank = STREAK_RANK_GROUPS[getStreakRankIndex(streak) + 1];
  const game = getGameFromId(gameId);
  const router = useRouter();

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
  const getUrl = useUrl();

  return (
    <div
      onClick={() => {
        router.push(getUrl(gameId, '/search'));
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
                <div className='font-medium'>{streakRank.title}</div>
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
  );
}

export function ThinkyHomePageLoggedIn({ user }: { user: User }) {
  const getUrl = useUrl();
  const router = useRouter();

  const { data: userConfigs, isLoading: configsLoading } = useSWRHelper<{ [key: string]: UserConfig }>('/api/user-configs/');
  const { data: levelOfDays, isLoading: levelOfDaysLoading } = useSWRHelper<{ [key: string]: Level }>('/api/level-of-day/');

  function getSuggestedAction({ userConfig, game }: { userConfig?: UserConfig, game: Game }) {
    // suggest the tutorial if it hasn't been completed
    if (!userConfig?.tutorialCompletedAt) {
      if (game.disableTutorial) {
        return null;
      }

      return (
        <ChapterSelectCardBase title={game.displayName + ' Tutorial'} game={game} id={game.id + '-tutorial'} levelData={'00000000\n00400000\n00020300\n00000000'}
          href={getUrl(game.id, '/tutorial')}
        />
      );
    }

    // next suggest the next campaign chapter
    if (!game.disableCampaign) {
      if (userConfig?.chapterUnlocked === game.chapterCount && !game.disableRanked) {
        return (
          <ChapterSelectCardBase subtitle='Compete in leaderboards' title='Play Ranked Mode' href={getUrl(game.id, '/ranked')} game={game} id={game.id + '-ranked'} levelData={'22222222\n6789ABCD\n11111111\n555555555'} />
        );
      }

      return (
        <ChapterSelectCard titleOverride={'Continue ' + game.displayName + ' Campaign'} chapter={userConfig?.chapterUnlocked ?? 1} href={getUrl(game.id, '/chapter' + (userConfig?.chapterUnlocked ?? 1))} />
      );
    }

    // if nothing else, just put a card that says Explore
    return (
      <ChapterSelectCardBase title={'Explore ' + game.displayName} game={game} id={game.id + '-explore'} levelData={'00000000\n00412310\n00506300\n00020000'} href={getUrl(game.id, '/')} />
    );
  }

  return (
    <div className='flex flex-col gap-8 items-center max-w-7xl mx-auto '>
      {/* User Profile Section */}
      <div className='w-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-3 shadow-lg text-white'>
        <div className='flex flex-col md:flex-row justify-between items-center gap-4'>
          <div className='flex items-center gap-4'>
            <div className='bg-white/20 p-3 rounded-full'>
              <FormattedUser id={user._id.toString()} user={user} />
            </div>
            <div className='flex flex-col'>
              <h1 className='text-2xl font-bold'>Welcome back!</h1>
              <p className='text-white/80'>Continue your puzzle journey</p>
            </div>
          </div>
          <div className='bg-white/10 p-3 rounded-lg backdrop-blur-sm'>
            <StreakCalendar />
          </div>
        </div>
      </div>
      {/* Games Section */}
      <div className='w-full'>
        <h2 className='text-2xl font-bold mb-4 text-center'>Thinky Games</h2>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          {Object.values(Games).map(game => {
            const userConfig = userConfigs && userConfigs[game.id];

            if (game.id === GameId.THINKY) {
              return null;
            }

            const levelOfDay = levelOfDays && levelOfDays[game.id];
            const { streak, timeToKeepStreak } = userConfig ? getStreak(userConfig) : { streak: 0, timeToKeepStreak: 0 };

            return (
              <div
                key={`game-${game.id}`}
                className='bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700'
              >
                {/* Game Header */}
                <div className='bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 p-4 flex items-center'>
                  <div className='flex items-center gap-3'>
                    <GameLogo gameId={game.id} id={game.id} size={36} />
                    <h3
                      className='font-semibold text-2xl cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors'
                      onClick={() => {
                        router.push(getUrl(game.id));
                      }}
                    >
                      {game.displayName}
                    </h3>
                  </div>
                </div>
                
                <div className='p-4 flex flex-col gap-4'>
                  {/* Game-specific Quick Actions */}
                  <div className='flex flex-col gap-2'>
                    <h4 className='font-medium text-sm text-gray-500 dark:text-gray-400'>Quick Actions</h4>
                    <div className='grid grid-cols-2 gap-2'>
                      <Link
                        href={getUrl(game.id)}
                        className='flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 hover:shadow-md transition'
                      >
                        <span className='text-xl mb-1'>🏠</span>
                        <span className='text-sm font-medium'>Home</span>
                      </Link>
                      
                      <Link
                        href={getUrl(game.id, '/search')}
                        className='flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 hover:shadow-md transition'
                      >
                        <span className='text-xl mb-1'>🔍</span>
                        <span className='text-sm font-medium'>Browse Levels</span>
                      </Link>
                      
                      <Link
                        href={getUrl(game.id, '/create')}
                        className='flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 hover:shadow-md transition'
                      >
                        <span className='text-xl mb-1'>🎨</span>
                        <span className='text-sm font-medium'>Create</span>
                      </Link>
                      
                      {!game.disableRanked ? (
                        <Link
                          href={getUrl(game.id, '/ranked')}
                          className='flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 hover:shadow-md transition'
                        >
                          <span className='text-xl mb-1'>🏆</span>
                          <span className='text-sm font-medium'>Ranked</span>
                        </Link>
                      ) : (
                        <div className='flex flex-col items-center justify-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 opacity-60 cursor-not-allowed'>
                          <span className='text-xl mb-1'>🏆</span>
                          <span className='text-sm font-medium'>Coming Soon</span>
                        </div>
                      )}
                      
                      {levelOfDay && (
                        <Link
                          href={getUrl(game.id, '/level-of-the-day')}
                          className='flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 hover:shadow-md transition'
                        >
                          <span className='text-xl mb-1'>📅</span>
                          <span className='text-sm font-medium'>Level of the Day</span>
                          <span className='text-xs text-gray-500 dark:text-gray-400'>
                            {levelOfDay.userId?.name}
                          </span>
                        </Link>
                      )}
                      
                      {!game.disableMultiplayer && (
                        <Link
                          href={getUrl(game.id, '/multiplayer')}
                          className='flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 hover:shadow-md transition'
                        >
                          <span className='text-xl mb-1'>👥</span>
                          <span className='text-sm font-medium'>Multiplayer</span>
                        </Link>
                      )}
                    </div>
                  </div>
                  
                  {/* Streak Display */}
                  {userConfig && (
                    <div className='mt-4'>
                      <StreakDisplay streak={streak} timeToKeepStreak={timeToKeepStreak} gameId={game.id} userConfig={userConfig} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Global Quick Actions Section */}
      <div className='w-full'>
        <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
          <div className='flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition'>
            <span className='text-2xl mb-2'>👥</span>
            <span className='font-medium mb-2'>Users</span>
            <MultiSelectUser
              className='w-full'
              placeholder='Search users...'
              onSelect={(selectedItem: User) => {
                router.push(`/users/${selectedItem._id}`);
              }}
            />
          </div>
          
          <Link
            href='/pro'
            className='flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition'
          >
            <span className='text-2xl mb-2'>⭐</span>
            <span className='font-medium'>Pro Features</span>
          </Link>
          
          <Link
            href='/settings'
            className='flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition'
          >
            <span className='text-2xl mb-2'>⚙️</span>
            <span className='font-medium'>Settings</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
