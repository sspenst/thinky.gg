import Page from '@root/components/page/page';
import { GameId } from '@root/constants/GameId';
import { Game, Games } from '@root/constants/Games';
import { AppContext } from '@root/contexts/appContext';
import useUrl from '@root/hooks/useUrl';
import Image from 'next/image';
import React, { useContext } from 'react';

function GameCard({ game }: { game: Game }) {
  const getUrl = useUrl();

  return (
    <a suppressHydrationWarning href={getUrl(game.id)} className='flex flex-col gap-3 items-center justify-center w-full h-full p-4 border border-color-3 rounded-lg hover-bg-3 hover:scale-105 transition h-min w-min'>
      <Image src={game.logo} alt={game.displayName} width='128' height='128' className='w-32 h-32' style={{ minWidth: 128 }} />
      <span className='font-bold text-2xl'>{game.displayName}</span>
    </a>
  );
}

export default function ThinkyHomePage() {
  const getUrl = useUrl();
  const { userConfig } = useContext(AppContext);

  return (
    <Page title='Thinky.gg'
      style={{
        // backgroundImage: 'url(https://i.imgur.com/h2qnMrV.png)',
        // height: '100vh',
        // center
        backgroundPosition: 'center',
        /** add a fade to black on the top half of the image */
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        backgroundBlendMode: 'multiply',
        // background: 'linear-gradient(rgba(0,0,0,1), rgba(0,0,0,0)), url(https://i.imgur.com/h2qnMrV.png)',
      }}>
      <div className='flex justify-center'>
        <div className='flex flex-wrap justify-center m-6 gap-24'>
          {Object.values(Games).map(game => {
            if (game.id === GameId.THINKY) {
              return null;
            }

            return (
              <div className='flex flex-col items-center gap-6' key={`game-${game.id}`}>
                <GameCard game={game} />
                <video autoPlay loop muted className='rounded-lg w-40 text-center fadeIn' src={game.videoDemo} />
                <div className='p-2 w-auto text-center text-xl fadeIn'>
                  {game.shortDescription}
                </div>
                <a
                  className='text-2xl font-bold px-4 py-3 border-2 border-color-3 rounded-lg hover-bg-3 hover:scale-110 transition'
                  href={userConfig?.tutorialCompletedAt ? getUrl(game.id, '/play') : getUrl(game.id, '/tutorial')}
                  role='button'
                >
                  Play Now
                </a>
              </div>
            );
          } )}
        </div>
      </div>
      {/* features that span every game ("platform" features) */}
      <div className='flex flex-col gap-12 items-center p-12'>
        <div className='h-40 w-40 rounded-xl p-4 border border-color-4'>
          Level Editor
        </div>
        <div className='h-40 w-40 rounded-xl p-4 border border-color-4'>
          Leaderboards
        </div>
        <div className='h-40 w-40 rounded-xl p-4 border border-color-4'>
          Reviews
        </div>
        <div className='h-40 w-40 rounded-xl p-4 border border-color-4'>
          Advanced Search
        </div>
        <div className='h-40 w-40 rounded-xl p-4 border border-color-4'>
         Automatic difficulty
        </div>
        <div className='h-40 w-40 rounded-xl p-4 border border-color-4'>
          Pro
        </div>
        {/* <div className='h-40 w-40 rounded-xl p-4 border border-color-4'>
          Multiplayer
        </div> */}
      </div>
    </Page>
  );
}
