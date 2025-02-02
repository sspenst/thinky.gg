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
import { useRouter } from 'next/navigation';
import React from 'react';
import ChapterSelectCard, { ChapterSelectCardBase } from '../cards/chapterSelectCard';
import { getStreakRankIndex, STREAK_RANK_GROUPS } from '../counters/AnimateCounterOne';
import FormattedUser from '../formatted/formattedUser';
import GameLogo from '../gameLogo';
import LoadingSpinner from '../page/loadingSpinner';
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
    <div onClick={() => {
      router.push(getUrl(gameId, '/search'));
    }} className={`cursor-pointer flex flex-col gap-2 max-w-sm w-full hover:scale-105 transition bg-1 border-2 pt-3 pb-2 px-4 rounded-lg shadow-sm
      ${!hasPlayedToday && streak > 0 ? ' ring-2 ring-yellow-400 shadow-lg shadow-yellow-200/50' : ''}`}>
      <div className='font-bold flex flex-row gap-1 text-xs items-center'>
        <GameLogo gameId={gameId} id={gameId + '-streak'} size={10} />
        {game.displayName} Streak
      </div>
      {streak === 0 ? (
        <div className='flex flex-col gap-1'>
          <div className='text-xl font-medium '>
            Start your streak today! 🎯
          </div>
          <div className='text-xs' style={{
            color: 'var(--color-gray)'
          }}>
            Play daily to build your streak and earn achievements
          </div>
        </div>
      ) : (
        <div className='flex items-center gap-2'>
          <div className='text-2xl font-bold'>{streak}</div>
          <div className='flex flex-col flex-1'>
            <div className='flex items-center gap-2 text-sm font-medium '>
              {streakRank.title}
              <span className='text-2xl'>{streakRank.emoji}</span>
            </div>
            {nextRank && (
              <div className='w-full space-y-0.5'>
                <div className='h-1 bg-gray-100 rounded-full overflow-hidden'>
                  <div
                    className='h-full bg-green-500'
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className='text-xs' style={{
                  color: 'var(--color-gray)'
                }}>
                  Next rank {nextRank.min - streak === 1 ? 'tomorrow' : `in ${nextRank.min - streak} days`}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {!hasPlayedToday && streak > 0 && timeToKeepStreak > 0 && (
        <div className='text-sm text-yellow-600 font-medium mt-1 flex'>
          Play within {Math.ceil(timeToKeepStreak / (1000 * 60 * 60))} hours to keep your streak going! 🔥
        </div>
      )}
    </div>
  );
}

export function ThinkyHomePageLoggedIn({ user }: { user: User }) {
  const getUrl = useUrl();

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
    <div className='flex flex-col gap-6 items-center'>
      <div className='flex flex-row max-w-full justify-center gap-6'>
        <FormattedUser id={user._id.toString()} user={user} />
        <StreakCalendar />
      </div>
      <div className='flex flex-wrap justify-center gap-10 max-w-full'>
        {Object.values(Games).map(game => {
          const userConfig = userConfigs && userConfigs[game.id];

          if (game.id === GameId.THINKY) {
            return null;
          }

          const continuePlaying = getSuggestedAction({ userConfig, game });
          const levelOfDay = levelOfDays && levelOfDays[game.id];
          const todayDateClean = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          const { streak, timeToKeepStreak } = userConfig ? getStreak(userConfig) : { streak: 0, timeToKeepStreak: 0 };

          return (
            <section className='flex flex-col items-center gap-6 max-w-full' key={`game-${game.id}`}>
              <a
                className='flex gap-3 items-center justify-center py-4 px-5 border border-color-3 rounded-xl hover:scale-105 transition bg-1'
                href={getUrl(game.id)}
              >
                <GameLogo gameId={game.id} id={game.id} size={36} />
                <h2 className='font-semibold text-4xl'>{game.displayName}</h2>
              </a>
              {userConfig && <StreakDisplay streak={streak} timeToKeepStreak={timeToKeepStreak} gameId={game.id} userConfig={userConfig} />}
              {configsLoading ? <LoadingSpinner /> : continuePlaying}
              {levelOfDaysLoading ? <LoadingSpinner /> : levelOfDay && <ChapterSelectCardBase
                game={game}
                href={getUrl(game.id, '/level-of-the-day')}
                id={'Level-of-day-' + game.id}
                levelData={levelOfDay.data}
                title={<div className='flex flex-col'><span>Level of the Day</span><span className='text-sm'>{todayDateClean}</span></div>}
                subtitle={'by ' + levelOfDay.userId?.name}
              />}
            </section>
          );
        }
        )}
      </div>
    </div>
  );
}
