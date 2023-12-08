import Page from '@root/components/page/page';
import { GameId } from '@root/constants/GameId';
import { Game, Games } from '@root/constants/Games';
import useUrl from '@root/hooks/useUrl';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';

function GameCard({ game }: { game: Game }) {
  const [gameId, setGameId] = useState<GameId>();
  const getUrl = useUrl();

  useEffect(() => {
    setGameId(game.id);
  }, [game.id]);

  if (game.id === GameId.THINKY) {
    return null;
  }

  return (
    <div className='flex flex-col items-center justify-center'>
      <a suppressHydrationWarning href={getUrl(gameId)} className='flex flex-col gap-3 items-center justify-center w-full h-full p-4 border border-color-3 rounded-lg hover-bg-3 hover:scale-105 transition'>
        <Image src={game.logo} alt={game.displayName} width='128' height='128' className='w-32 h-32' />
        <span className='font-medium text-xl'>{game.displayName}</span>
      </a>
    </div>
  );
}

export default function ThinkyHomePage() {
  return (
    <Page title='Puzzle Games - Thinky.gg'>
      <div className='flex flex-col items-center m-6 gap-8'>
        <div className='text-center'>
          <h1 className='font-bold text-3xl'>Thinky</h1>
          <h2 className='font-mono text-lg'>thinky.gg</h2>
        </div>
        <p>Currently in beta.</p>
        <div className='flex flex-wrap justify-center gap-8'>
          {Object.values(Games).map(game => (
            <GameCard game={game} key={game.id} />
          ))}
        </div>
      </div>
    </Page>
  );
}
