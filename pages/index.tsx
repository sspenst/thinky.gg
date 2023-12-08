import Page from '@root/components/page/page';
import { Games } from '@root/constants/Games';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

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
            <div key={game.id} className='flex flex-col items-center justify-center'>
              <Link href={`/${game.id}`} className='flex flex-col gap-3 items-center justify-center w-full h-full p-4 border border-color-3 rounded-lg hover-bg-3 hover:scale-105 transition'>
                <Image src={game.logo} alt={game.displayName} width='128' height='128' className='w-32 h-32' />
                <span className='font-medium text-xl'>{game.displayName}</span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}
