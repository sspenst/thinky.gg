// Optionally import the CSS
import 'cal-heatmap/cal-heatmap.css';
import { GameId } from '@root/constants/GameId';
import { Game, Games } from '@root/constants/Games';
import useSWRHelper from '@root/hooks/useSWRHelper';
import useUrl from '@root/hooks/useUrl';
import Level from '@root/models/db/level';
import User from '@root/models/db/user';
import UserConfig from '@root/models/db/userConfig';
import React from 'react';
import ChapterSelectCard, { ChapterSelectCardBase } from '../cards/chapterSelectCard';
import FormattedUser from '../formatted/formattedUser';
import GameLogo from '../gameLogo';
import LoadingSpinner from '../page/loadingSpinner';
import { StreakCalendar } from './StreakCalendar';

export function ThinkyHomePageLoggedIn({ user }: {user: User}) {
  const getUrl = useUrl();

  const { data: userConfigs, isLoading: configsLoading } = useSWRHelper<{[key: string]: UserConfig}>('/api/user-configs/');
  const { data: levelOfDays, isLoading: levelOfDaysLoading } = useSWRHelper<{[key: string]: Level}>('/api/level-of-day/');

  function getSuggestedAction({ userConfig, game }: {userConfig?: UserConfig, game: Game}) {
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

          return (
            <section className='flex flex-col items-center gap-6 max-w-full' key={`game-${game.id}`}>
              <a
                className='flex gap-3 items-center justify-center py-4 px-5 border border-color-3 rounded-xl hover:scale-105 transition bg-1'
                href={getUrl(game.id)}
              >
                <GameLogo gameId={game.id} id={game.id} size={36} />
                <h2 className='font-semibold text-4xl'>{game.displayName}</h2>
              </a>
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
