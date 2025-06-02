/* istanbul ignore file */
import GameLogo from '@root/components/gameLogo';
import AnimatedGrid from '@root/components/level/animatedGrid';
import Direction from '@root/constants/direction';
import { GameId } from '@root/constants/GameId';
import { Games } from '@root/constants/Games';
import Theme from '@root/constants/theme';
import { AppContext } from '@root/contexts/appContext';
import useUrl from '@root/hooks/useUrl';
import { Play, Share2, Trophy, Users } from 'lucide-react';
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

  return (
    <div className='flex flex-col gap-6 max-w-7xl mx-auto px-4'>
      {/* Hero Section - Above the fold */}
      <div className='md:my-10 flex flex-col justify-center items-center text-center'>
        <div className='max-w-4xl mx-auto'>
          <p className='text-xl md:text-2xl text-gray-800 dark:text-gray-100 mb-6 max-w-2xl mx-auto drop-shadow-sm mt-0'>
            Challenge your mind with beautifully crafted puzzle games. Create your own levels and share them with the world.
          </p>
          {/* Primary CTA */}
          <div className='flex flex-col sm:flex-row justify-center gap-4 mb-6'>
            <Link
              href={getUrl(Games[GameId.PATHOLOGY].id, user ? '/' : '/tutorial')}
              className='group relative px-8 py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-105'
            >
              <span className='relative z-10 flex items-center justify-center gap-3'>
                <Play className='h-6 w-6' />
                <span>Start Playing Free</span>
              </span>
            </Link>
          </div>
          {/* Key features that matter to puzzle players */}
          <div className='flex flex-wrap justify-center gap-8 text-md text-gray-600 dark:text-gray-100 drop-shadow-sm'>
            <div className='flex items-center gap-2'>
              <Trophy className='h-4 w-4' />
              <span>Levels for all skill levels</span>
            </div>
            <div className='flex items-center gap-2'>
              <Users className='h-4 w-4' />
              <span>Active Community</span>
            </div>
            <div className='flex items-center gap-2'>
              <Share2 className='h-4 w-4' />
              <span>Create Your Own Levels</span>
            </div>
          </div>
        </div>
      </div>
      {/* Quick Access - Account options */}
      <div className='bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl p-5 text-center shadow-lg border border-white/20'>
        <h3 className='text-xl font-semibold mb-3'>Join the Community</h3>
        <p className='text-gray-600 dark:text-gray-300 mb-5'>
          Create an account to track your achievements, compete on leaderboards, and create your own levels.
        </p>
        <div className='flex justify-center gap-4'>
          <Link
            href='/signup'
            className='px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition shadow-md hover:shadow-lg'
          >
            Sign Up Free
          </Link>
          <Link
            href='/login'
            className='px-6 py-3 bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-white rounded-lg font-medium transition border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md'
          >
            Log In
          </Link>
        </div>
      </div>
      {/* Games Section */}
      <div className='w-full' ref={gamesSectionRef}>
        <h2 className='text-4xl font-bold mb-4 text-center'>Our Two Games</h2>
        <p className='text-xl text-gray-600 dark:text-gray-200 mb-12 text-center max-w-2xl mx-auto'>
          Each game offers unique mechanics and hundreds of hand-crafted levels to master.
        </p>
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
        <h2 className='text-4xl font-bold mb-4 text-center'>Everything You Need</h2>
        <p className='text-xl text-gray-600 dark:text-gray-200 mb-12 text-center max-w-2xl mx-auto'>
          More than just puzzles - it&apos;s a complete platform for puzzle enthusiasts.
        </p>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          <FeatureCard
            description='Carefully crafted puzzle games designed to challenge your problem-solving skills and creativity.'
            title='Premium Puzzles'
            icon='🧩'
          />
          <FeatureCard
            description='Join thousands of puzzle enthusiasts who create, share, and solve levels together. Compete on leaderboards.'
            title='Thriving Community'
            icon='👥'
          />
          <FeatureCard
            description='Design your own levels with our intuitive editor and share them with the world. Get feedback from other players.'
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
            title='Multiplayer Fun'
            icon='🎮'
          />
          <FeatureCard
            description='Unlock advanced analytics, checkpoint saving, and more with our Pro subscription.'
            title='Pro Features'
            icon='⭐'
          />
        </div>
      </div>
      {/* Final Call to Action */}
      <div className='bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl p-12 text-center'>
        <h2 className='text-4xl font-bold mb-4'>Ready to Challenge Your Mind?</h2>
        <p className='text-xl mb-8 opacity-90'>
          Join thousands of puzzle enthusiasts and start your journey today.
        </p>
        <div className='flex flex-wrap justify-center gap-4'>
          {Object.values(Games).map(game => {
            if (game.id === GameId.THINKY) {
              return null;
            }

            return (
              <Link
                className='group relative flex items-center gap-3 px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg font-medium transition shadow-md hover:shadow-lg'
                key={`final-cta-${game.id}`}
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
