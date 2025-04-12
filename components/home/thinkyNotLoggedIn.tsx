/* istanbul ignore file */
import GameLogo from '@root/components/gameLogo';
import AnimatedGrid from '@root/components/level/animatedGrid';
import Direction from '@root/constants/direction';
import { GameId } from '@root/constants/GameId';
import { Games } from '@root/constants/Games';
import Theme from '@root/constants/theme';
import { AppContext } from '@root/contexts/appContext';
import useUrl from '@root/hooks/useUrl';
import { Gamepad2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useContext, useRef } from 'react';

interface FeatureCardProps {
  description: React.ReactNode;
  title: string;
  icon: string;
}

function FeatureCard({ description, title, icon }: FeatureCardProps) {
  return (
    <div className='w-full rounded-xl p-5 flex flex-col gap-3 items-start text-left border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition'>
      <div className='bg-blue-100 dark:bg-blue-900 p-3 rounded-lg'>
        <span className='text-2xl'>{icon}</span>
      </div>
      <h3 className='font-semibold text-xl'>
        {title}
      </h3>
      <div className='text-sm text-gray-600 dark:text-gray-300'>
        {description}
      </div>
    </div>
  );
}

interface GameCardProps {
  game: typeof Games[GameId];
  levelData: string;
  instructions: Direction[];
  leastMoves: number;
  theme: Theme;
}

function GameCard({ game, levelData, instructions, leastMoves, theme }: GameCardProps) {
  const getUrl = useUrl();
  const router = useRouter();
  const { user } = useContext(AppContext);

  return (
    <div className='bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300'>
      <div className='bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 p-6 flex flex-col items-center text-center'>
        <GameLogo gameId={game.id} id={game.id} size={64} />
        <h3
          className='font-semibold text-3xl mt-4 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors'
          onClick={() => {
            router.push(getUrl(game.id));
          }}
        >
          {game.displayName}
        </h3>
        <p className='text-gray-600 dark:text-gray-300 mt-2 max-w-md'>{game.shortDescription}</p>
      </div>
      
      <div className='p-6 flex flex-col items-center gap-6'>
        <div className='flex h-60 w-60 max-w-full cursor-pointer' onClick={() => {
          router.push(getUrl(game.id));
        }}>
          <AnimatedGrid
            leastMoves={leastMoves}
            animationInstructions={instructions}
            game={game}
            theme={theme}
            id={'level-preview-' + game.id}
            levelData={levelData}
          />
        </div>
        
        <Link
          className='inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition shadow-md hover:shadow-lg'
          href={user ? getUrl(game.id, '/') : getUrl(game.id, '/tutorial')}
          role='button'
        >
          <span>Play Now</span>
          <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5 ml-2' viewBox='0 0 20 20' fill='currentColor'>
            <path fillRule='evenodd' d='M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z' clipRule='evenodd' />
          </svg>
        </Link>
      </div>
    </div>
  );
}

export default function ThinkyHomePageNotLoggedIn() {
  const getUrl = useUrl();
  const { user } = useContext(AppContext);
  const gamesSectionRef = useRef<HTMLDivElement>(null);
  const whatIsThinkySectionRef = useRef<HTMLDivElement>(null);

  const strMap = {
    'u': Direction.UP,
    'd': Direction.DOWN,
    'l': Direction.LEFT,
    'r': Direction.RIGHT,
    'X': Direction.NONE,
  } as {[key: string]: Direction};

  const gameInstr = {
    [GameId.PATHOLOGY]: {
      data: '0001\n0100\n4220\n1300',
      instructions: 'uurrdrddllXuurrdddldX'.split('').map(x => strMap[x]),
      leastMoves: 8,
      theme: Theme.Modern,
    },
    [GameId.SOKOPATH]: {
      data: '0000\n0130\n0220\n0003',
      instructions: 'ddddrrudllurrlluurrrddXrrdduullddrdruX'.split('').map(x => strMap[x]),
      leastMoves: 14,
      theme: Theme.Winter,
    },
  };
  const router = useRouter();

  const scrollToGames = () => {
    gamesSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToWhatIsThinky = () => {
    whatIsThinkySectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className='flex flex-col gap-8 max-w-7xl mx-auto px-4 py-6'>
      {/* Hero Section */}
      <div className='text-center max-w-4xl mx-auto'>
        <p className='text-lg text-black dark:text-gray-100 mb-8'>
          A platform dedicated to <strong>high-quality puzzle games</strong> that challenge your <strong>mind</strong> and <strong>creativity</strong>.
        </p>
        <div className='flex flex-wrap justify-center gap-4'>
          <button
            onClick={scrollToGames}
            className='group relative px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition shadow-md hover:shadow-lg overflow-hidden'
          >
            <span className='relative z-10 flex items-center gap-2'>
              <Gamepad2 className='h-5 w-5' />
              <span>Games</span>
            </span>
          </button>
          <button
            onClick={scrollToWhatIsThinky}
            className='group relative px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg font-medium transition overflow-hidden'
          >
            <span className='relative z-10 flex items-center gap-2'>
              <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
              </svg>
              <span>What are Thinky Games?</span>
            </span>
          </button>
        </div>
        <div className='mt-4 flex justify-center gap-4'>
          <Link
            href='/signup'
            className='px-4 py-2 bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-white rounded-lg font-medium transition border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md'
          >
            Sign Up
          </Link>
          <Link
            href='/login'
            className='px-4 py-2 bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-white rounded-lg font-medium transition border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md'
          >
            Log In
          </Link>
        </div>
      </div>
      {/* Games Section */}
      <div className='w-full' ref={gamesSectionRef}>
        <h2 className='text-3xl font-bold mb-8 text-center'>Our Games</h2>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
          {Object.values(Games).map(game => {
            if (game.id === GameId.THINKY) {
              return null;
            }

            return (
              <GameCard
                key={`game-${game.id}`}
                game={game}
                levelData={gameInstr[game.id].data}
                instructions={gameInstr[game.id].instructions}
                leastMoves={gameInstr[game.id].leastMoves}
                theme={gameInstr[game.id].theme}
              />
            );
          })}
        </div>
      </div>
      {/* What is Thinky.gg Section */}
      <div className='w-full' ref={whatIsThinkySectionRef}>
        <h2 className='text-3xl font-bold mb-8 text-center'>What is Thinky.gg?</h2>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          <FeatureCard
            description='Thinky.gg is home to a collection of carefully crafted puzzle games designed to challenge your problem-solving skills and creativity.'
            title='Puzzle Games'
            icon='🧩'
          />
          <FeatureCard
            description='Join thousands of puzzle enthusiasts who create, share, and solve levels together. Compete on leaderboards and discover new challenges.'
            title='Community'
            icon='👥'
          />
          <FeatureCard
            description='Design your own levels with our intuitive editor and share them with the world. See how others solve your puzzles and get feedback.'
            title='Level Creation'
            icon='🎨'
          />
          <FeatureCard
            description='Track your progress with daily streaks, earn achievements, and see your improvement over time.'
            title='Progress Tracking'
            icon='📊'
          />
          <FeatureCard
            description='Play with friends in real-time and solve puzzles together. Challenge each other to beat your best times.'
            title='Multiplayer'
            icon='🎮'
          />
          <FeatureCard
            description='Unlock advanced analytics, checkpoint saving, and more with our Pro subscription to enhance your puzzle-solving experience.'
            title='Pro Features'
            icon='⭐'
          />
        </div>
      </div>
      {/* Call to Action */}
      <div className='text-center'>
        <h2 className='text-3xl font-bold mb-4'>Ready to Start?</h2>
        <p className='text-xl text-gray-600 dark:text-gray-300 mb-8'>
          Join thousands of puzzle enthusiasts and start your journey today.
        </p>
        <div className='flex flex-wrap justify-center gap-4'>
          {Object.values(Games).map(game => {
            if (game.id === GameId.THINKY) {
              return null;
            }

            return (
              <Link
                className='group relative flex items-center gap-3 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition shadow-md hover:shadow-lg overflow-hidden'
                key={`game-${game.id}`}
                href={user ? getUrl(game.id, '/') : getUrl(game.id, '/tutorial')}
                role='button'
              >
                <span className='relative z-10 flex items-center gap-2'>
                  <GameLogo gameId={game.id} id={game.id} size={24} />
                  <span>Play {game.displayName}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
