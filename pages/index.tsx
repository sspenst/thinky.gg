import Page from '@root/components/page/page';
import { GameId } from '@root/constants/GameId';
import { Game, Games } from '@root/constants/Games';
import useUrl from '@root/hooks/useUrl';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';

function GameCard({ game, onMouseOver, onMouseOut }: { game: Game, onMouseOver: () => void, onMouseOut: () => void }) {
  const [gameId, setGameId] = useState<GameId>();
  const getUrl = useUrl();

  useEffect(() => {
    setGameId(game.id);
  }, [game.id]);

  if (game.id === GameId.THINKY) {
    return null;
  }

  return (
    <div className='flex flex-col items-center justify-center' style={{}}
    >
      <a onMouseOver={onMouseOver} onMouseOut={onMouseOut}
        suppressHydrationWarning href={getUrl(gameId)} className='flex flex-col gap-3 items-center justify-center w-full h-full p-4 border border-color-3 rounded-lg hover-bg-3 hover:scale-105 transition'
        style={{
          backgroundColor: 'rgba(0,0,0,0.4)',

        }}
      >
        <Image src={game.logo} alt={game.displayName} width='128' height='128' className='w-32 h-32' />
        <span className='font-medium text-xl'>{game.displayName}</span>
      </a>
    </div>
  );
}

export default function ThinkyHomePage() {
  const [gameHovered, setGameHovered] = useState<Game>();

  return (
    <Page title='Puzzle Games - Thinky.gg' style={{
      backgroundImage: 'url(https://i.imgur.com/h2qnMrV.png)',
      height: '100vh',
      // center
      backgroundPosition: 'center',
      /** add a fade to black on the top half of the image */
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      backgroundBlendMode: 'multiply',
      background: 'linear-gradient(rgba(0,0,0,1), rgba(0,0,0,0)), url(https://i.imgur.com/h2qnMrV.png)',

    }}>
      <div className='flex flex-col items-center m-6 gap-8'
      >
        <div className='flex flex-col text-4xl md:text-8xl bg-opacity-60 rounded p-4 max-w-6xl mx-auto items-center gap-10'>
          <div className='flex flex-col text-center' style={{

          }}>
            <h1 className='' style={{
              /* super big font for the title. make it really stand out
              /* font-size: 8rem;
          font-weight: bold;
          color: #FFFFFF;
          text-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
          text-align: center;
              */

              fontWeight: 'bold',
              color: '#FFFFFF',
              textAlign: 'center',
              /** add some shadows and stuff to make it look cool.. */
              textShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',

            }}>Thinky.gg</h1>
            <h2 className='text-lg italic'>Puzzle Games</h2>
          </div>

        </div>
        <div className='flex flex-wrap justify-center gap-8 mt-16'>
          {Object.values(Games).map(game => (
            <GameCard game={game} key={game.id} onMouseOver={() => {
              setGameHovered(game);
            }} onMouseOut={() => {
              setGameHovered(undefined);
            }
            } />
          ))}
        </div>
        {gameHovered && <div className='rounded-lg p-2 w-auto text-center fadeIn' style={{

          backgroundColor: 'rgba(0,0,0,0.6)',
        }} >{gameHovered.shortDescription}</div>}
      </div>
    </Page>
  );
}
