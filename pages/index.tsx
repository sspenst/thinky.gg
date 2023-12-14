import 'react-responsive-carousel/lib/styles/carousel.min.css';
import GameLogo from '@root/components/gameLogo';
import GameLogoAndLabel from '@root/components/gameLogoAndLabel';
import Page from '@root/components/page/page';
import { GameId } from '@root/constants/GameId';
import { Game, Games } from '@root/constants/Games';
import { AppContext } from '@root/contexts/appContext';
import useUrl from '@root/hooks/useUrl';
import Image from 'next/image';
import React, { useContext } from 'react';
import { Carousel } from 'react-responsive-carousel';

function GameCard({ game }: { game: Game }) {
  const getUrl = useUrl();

  return (
    <a suppressHydrationWarning href={getUrl(game.id)} className='flex flex-col gap-3 items-center justify-center w-full h-full p-4 border border-color-3 rounded-lg hover-bg-3 hover:scale-105 transition h-min w-min'>
      <Image src={game.logo} alt={game.displayName} width='128' height='128' className='w-32 h-32' style={{ minWidth: 128 }} />
      <span className='font-medium text-xl'>{game.displayName}</span>
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
      <div className=' flex w-full justify-center'>
        <Carousel className='max-w-screen-lg' showStatus={false}>

          {Object.values(Games).filter(game => game.id !== GameId.THINKY).map(game => {
            return (
              <div className='flex justify-center' key={`carousel-game-${game.id}`}>
                <video autoPlay loop muted playsInline >
                  <source src='https://i.imgur.com/b3BjzDz.mp4' type='video/mp4' />
                </video>
                <p className='legend flex flex-col' style={{
                  textAlign: 'left',
                  paddingLeft: 16,
                }}>
                  <span className='text-2xl font-bold text-left'>
                    {game.displayName}
                  </span>
                  <span className='text-lg text-left'>
                    {game.shortDescription}
                  </span>
                </p>
              </div>
            );
          })}
        </Carousel>

      </div>
      {/* features that span every game ("platform" features) */}
      <div className='flex gap-12 flex-wrap justify-center'>
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
      <div className='flex justify-center'>
        <div className='flex flex-wrap justify-center m-6 gap-24'>
          {Object.values(Games).map(game => {
            if (game.id === GameId.THINKY) {
              return null;
            }

            return (
              <div className='flex flex-col items-center gap-6' key={`game-${game.id}`}>
                <a className='flex gap-3 items-center hover:underline mb-4' href={getUrl(game.id)}>
                  <GameLogo gameId={game.id} id={game.id} size={48} />
                  <span className='text-4xl font-bold'>{game.displayName}</span>
                </a>
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
    </Page>
  );
}
