import { GameId } from '@root/constants/GameId';
import { Game, Games } from '@root/constants/Games';
import useSWRHelper from '@root/hooks/useSWRHelper';
import useUrl from '@root/hooks/useUrl';
import Level from '@root/models/db/level';
import User from '@root/models/db/user';
import UserConfig from '@root/models/db/userConfig';
import React from 'react';
import Card from '../cards/card';
import ChapterSelectCard, { ChapterSelectCardBase } from '../cards/chapterSelectCard';
import LevelCardWithTitle from '../cards/levelCardWithTitle';
import FormattedUser from '../formatted/formattedUser';
import GameLogo from '../gameLogo';
import LoadingSpinner from '../page/loadingSpinner';

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

        <ChapterSelectCard titleOverride={game.displayName + ' Tutorial'} chapter={0}
          href={getUrl(game.id, '/tutorial')}
        />

      );
    }

    // next suggest the next campaign chapter
    if (game.disableCampaign) {
      return null;
    }

    // if we are at the last chapter, show rank
    console.log(userConfig?.chapterUnlocked, game.chapterCount);

    if (userConfig?.chapterUnlocked === game.chapterCount && !game.disableRanked) {
      return (
        <ChapterSelectCard titleOverride='Rank Mode' chapter={0} href={getUrl(game.id, '/ranked')} />
      );
    }

    return (
      <ChapterSelectCard titleOverride={'Continue ' + game.displayName + ' Campaign'} chapter={userConfig?.chapterUnlocked ?? 1} href={getUrl(game.id, '/play')} />
    );
  }

  return (

    <div className='flex flex-col gap-6 items-center'>
      <FormattedUser id={user._id.toString()} user={user} />
      <div className='flex flex-wrap justify-center gap-20 max-w-full'>
        {Object.values(Games).map(game => {
          const userConfig = userConfigs && userConfigs[game.id];

          if (game.id === GameId.THINKY) {
            return null;
          }

          const continuePlaying = getSuggestedAction({ userConfig, game });
          const levelOfDay = levelOfDays && levelOfDays[game.id];

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
                title={'Level of the Day'}
                subtitle={'by ' + levelOfDay.userId.name}
              />}
            </section>
          );
        }
        )}
      </div>
    </div>
  );
}
