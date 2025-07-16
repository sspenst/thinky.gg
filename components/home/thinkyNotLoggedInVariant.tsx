/* istanbul ignore file */
import GameLogo from '@root/components/gameLogo';
import AnimatedGrid from '@root/components/level/animatedGrid';
import Direction from '@root/constants/direction';
import { GameId } from '@root/constants/GameId';
import { Games } from '@root/constants/Games';
import Theme from '@root/constants/theme';
import { AppContext } from '@root/contexts/appContext';
import useUrl from '@root/hooks/useUrl';
import { ArrowRight, BookOpen, Lightbulb, Trophy, Zap } from 'lucide-react';
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

// Simple step indicator without fake progress
function LearningStep({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className='flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700'>
      <div className='flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm'>
        {number}
      </div>
      <div>
        <h4 className='font-semibold text-gray-900 dark:text-gray-100'>{title}</h4>
        <p className='text-sm text-gray-600 dark:text-gray-300 mt-1'>{description}</p>
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
          <span>Try the Tutorial</span>
          <ArrowRight className='h-4 w-4 ml-2' />
        </Link>
      </div>
    </div>
  );
}

export default function ThinkyHomePageNotLoggedInVariant() {
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
    <div className='flex flex-col gap-8 max-w-7xl mx-auto px-4'>
      {/* Hero Section - Focus on Learning & Discovery */}
      <div className='md:my-10 flex flex-col justify-center items-center text-center'>
        <div className='max-w-4xl mx-auto'>
          {/* Curiosity-driven headline */}
          <h1 className='text-4xl md:text-6xl font-bold mb-6 text-gray-900 dark:text-gray-100'>
            Think You&apos;re Good at Puzzles?
          </h1>
          <p className='text-xl md:text-2xl text-gray-700 dark:text-gray-200 mb-8 max-w-3xl mx-auto'>
            These aren&apos;t your typical puzzles. Start with our interactive tutorial to discover mechanics that will change how you think about problem-solving.
          </p>
          {/* Primary CTA - Clear and Direct */}
          <div className='mb-12'>
            <Link
              href={getUrl(Games[GameId.PATHOLOGY].id, '/tutorial')}
              className='group inline-flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-105'
            >
              <BookOpen className='h-6 w-6' />
              <span>Start the Tutorial</span>
              <ArrowRight className='h-5 w-5 group-hover:translate-x-1 transition-transform' />
            </Link>
            <p className='text-sm text-gray-600 dark:text-gray-400 mt-3'>
              Takes about 5 minutes • No account needed
            </p>
          </div>
          {/* Value props that are real */}
          <div className='flex flex-wrap justify-center gap-8 text-sm text-gray-600 dark:text-gray-100'>
            <div className='flex items-center gap-2'>
              <Lightbulb className='h-4 w-4' />
              <span>Learn unique mechanics</span>
            </div>
            <div className='flex items-center gap-2'>
              <Zap className='h-4 w-4' />
              <span>Interactive learning</span>
            </div>
            <div className='flex items-center gap-2'>
              <Trophy className='h-4 w-4' />
              <span>Progressive difficulty</span>
            </div>
          </div>
        </div>
      </div>
      {/* What You'll Learn Section */}
      <div className='bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-8'>
        <h2 className='text-3xl font-bold text-center mb-2'>What You&apos;ll Learn</h2>
        <p className='text-center text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto'>
          Our tutorial introduces you to puzzle mechanics step by step, so you can focus on the fun of solving rather than figuring out the rules.
        </p>
        <div className='grid md:grid-cols-3 gap-6'>
          <LearningStep
            number={1}
            title='Basic Movement'
            description='Learn how to navigate and interact with puzzle elements in a safe, guided environment.'
          />
          <LearningStep
            number={2}
            title='Core Mechanics'
            description='Discover the key mechanics that make these puzzles unique and engaging.'
          />
          <LearningStep
            number={3}
            title='Problem Solving'
            description='Practice the thinking patterns that will help you tackle more complex challenges.'
          />
        </div>
      </div>
      {/* Games Section - Simplified */}
      <div className='w-full' ref={gamesSectionRef}>
        <h2 className='text-4xl font-bold mb-4 text-center'>Two Games to Master</h2>
        <p className='text-xl text-gray-600 dark:text-gray-200 mb-12 text-center max-w-2xl mx-auto'>
          Each game teaches different problem-solving skills. Start with either tutorial to get a feel for the puzzles.
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
      {/* Final CTA - Simple and Direct */}
      <div className='bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl p-12 text-center'>
        <h2 className='text-4xl font-bold mb-4'>Ready to Start Learning?</h2>
        <p className='text-xl mb-8 opacity-90 max-w-2xl mx-auto'>
          The best way to understand these puzzles is to try them. Start with a tutorial and see what makes them special.
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
                <GameLogo gameId={game.id} id={game.id} size={24} />
                <span>Try {game.displayName}</span>
                <ArrowRight className='h-4 w-4 group-hover:translate-x-1 transition-transform' />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
