// pages/index.tsx
import Head from 'next/head';
import React from 'react';

const Home: React.FC = () => {
  return (
    <div className='mt-3'>
      <Head>
        <title>Sokoban - The Classic Puzzle Game from Thinky.gg</title>
        <link rel='icon' href='/favicon.ico' />
      </Head>
      <main className='flex flex-col items-center justify-center w-full flex-1 px-20 text-center'>
        <h1 className='text-6xl font-bold'>
          Welcome to <span className='text-blue-600'>Sokoban</span>
        </h1>
        <p className='mt-3 text-2xl'>
          The classic warehouse puzzle game that tests your logical thinking.
        </p>
        <div className='mt-3 bg-3 py-2 px-4 rounded-lg max-w-4xl'>
          <h2 className='text-4xl font-semibold mb-5'>How to Play</h2>
          <p className='text-lg mb-3'>
    Push crates or boxes onto designated storage locations. The challenge is that boxes can only be pushed, not pulled, and only one box may be pushed at a time.
          </p>
          <p className='text-sm mb-3'>
    A level is solved when all boxes are at the storage locations. Plan your moves carefully to avoid getting stuck!
          </p>

        </div>
        <div className='flex flex-wrap items-center justify-around max-w-4xl mt-6 sm:w-full pb-6'>
          <a
            href='#'
            className='p-6 mt-6 text-left border w-96 rounded-xl hover:text-blue-600 focus:text-blue-600'
          >
            <h3 className='text-2xl font-bold'>Play Now &rarr;</h3>
            <p className='mt-4 text-xl'>
              Start playing!
            </p>
          </a>
          <a
            href='#'
            className='p-6 mt-6 text-left border w-96 rounded-xl hover:text-blue-600 focus:text-blue-600'
          >
            <h3 className='text-2xl font-bold'>Discord &rarr;</h3>
            <p className='mt-4 text-xl'>
              Join our Discord community!
            </p>
          </a>

        </div>
      </main>
    </div>
  );
};

export default Home;
