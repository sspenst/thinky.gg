// Optionally import the CSS
import { GameId } from '@root/constants/GameId';
import { Games } from '@root/constants/Games';
import useSWRHelper from '@root/hooks/useSWRHelper';
import useUrl from '@root/hooks/useUrl';
import { getStreak } from '@root/lib/cleanUser';
import Level from '@root/models/db/level';
import User from '@root/models/db/user';
import UserConfig from '@root/models/db/userConfig';
import 'cal-heatmap/cal-heatmap.css';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import FormattedUser from '../formatted/formattedUser';
import GameLogo from '../gameLogo';
import MultiSelectUser from '../page/multiSelectUser';
import QuickActionButton from '../quickActionButton';
import StreakSection from '../streak/streakSection';
import { StreakCalendar } from './streakCalendar';

interface StreakDisplayProps {
  streak: number;
  timeToKeepStreak: number;
  gameId: GameId;
  userConfig?: UserConfig;
}

export function ThinkyHomePageLoggedIn({ user }: { user: User }) {
  const getUrl = useUrl();
  const router = useRouter();

  const { data: userConfigs, isLoading: configsLoading } = useSWRHelper<{ [key: string]: UserConfig }>('/api/user-configs/');
  const { data: levelOfDays, isLoading: levelOfDaysLoading } = useSWRHelper<{ [key: string]: Level }>('/api/level-of-day/');

  return (
    <div className='flex flex-col gap-8 items-center max-w-7xl mx-auto '>
      {/* User Profile Section */}
      <div className='w-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-3 shadow-lg text-white md:mt-8 mt-2'>
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
                      <QuickActionButton
                        href={getUrl(game.id)}
                        icon='🏠'
                        text='Home'
                      />
                      <QuickActionButton
                        href={getUrl(game.id, '/search')}
                        icon='🔍'
                        text='Find Levels'
                      />
                      <QuickActionButton
                        href={getUrl(game.id, '/drafts')}
                        icon='🎨'
                        text='Create'
                      />
                      {!game.disableRanked ? (
                        <QuickActionButton
                          href={getUrl(game.id, '/ranked')}
                          icon='🏆'
                          text='Ranked'
                        />
                      ) : (
                        <QuickActionButton
                          href='#'
                          icon='🏆'
                          text='Coming Soon'
                          disabled
                        />
                      )}
                      {levelOfDay && (
                        <QuickActionButton
                          href={getUrl(game.id, '/level-of-the-day')}
                          icon='📅'
                          text='Level of the Day'
                          subtitle={levelOfDay.userId?.name}
                        />
                      )}
                      {!game.disableMultiplayer && (
                        <QuickActionButton
                          href={getUrl(game.id, '/multiplayer')}
                          icon='👥'
                          text='Multiplayer'
                        />
                      )}
                    </div>
                  </div>
                  {/* Streak Display */}
                  {userConfig && (
                    <div className='mt-4'>
                      <StreakSection gameId={game.id} userConfig={userConfig} />
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
          <div className='flex flex-col items-center justify-center p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition'>
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
            className='flex flex-col items-center justify-center p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition'
          >
            <span className='text-2xl mb-2'>⭐</span>
            <span className='font-medium'>Pro Features</span>
          </Link>
          <Link
            href='/settings'
            className='flex flex-col items-center justify-center p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition'
          >
            <span className='text-2xl mb-2'>⚙️</span>
            <span className='font-medium'>Settings</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
