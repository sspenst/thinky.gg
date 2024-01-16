/* istanbul ignore file */
import GameLogo from '@root/components/gameLogo';
import AnimatedGrid from '@root/components/level/animatedGrid';
import Page from '@root/components/page/page';
import Dimensions from '@root/constants/dimensions';
import Direction from '@root/constants/direction';
import { GameId } from '@root/constants/GameId';
import { Games } from '@root/constants/Games';
import Theme from '@root/constants/theme';
import { AppContext } from '@root/contexts/appContext';
import useUrl from '@root/hooks/useUrl';
import { CarouselJsonLd, NextSeo, SoftwareAppJsonLd } from 'next-seo';
import React, { useContext } from 'react';

interface FeatureCardProps {
  description: React.ReactNode;
  title: string;
  video: string;
}

function FeatureCard({ description, title, video }: FeatureCardProps) {
  return (
    <section className='w-80 max-w-full rounded-xl p-4 flex flex-col gap-3 items-center text-center border border-color-4 bg-1'>
      <h3 className='font-semibold text-2xl'>
        {title}
      </h3>
      <div className='text-sm'>
        {description}
      </div>
      <video autoPlay loop muted playsInline className='rounded-lg text-center' src={video} />
    </section>
  );
}

export default function ThinkyHomePage() {
  const getUrl = useUrl();
  const { user } = useContext(AppContext);

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
    [GameId.SOKOBAN]: {
      data: '0000\n0130\n0220\n0003',
      instructions: 'ddddrrudllurrlluurrrddXrrdduullddrdruX'.split('').map(x => strMap[x]),
      leastMoves: 14,
      theme: Theme.Winter,
    },
  };

  return (
    <>
      <NextSeo
        title={'Thinky - Play Thinking Puzzle Games Like Sokoban and Pathology'}
        description='Thinky is a platform dedicated to high-quality puzzle games. Solve and optimize puzzles, search thousands of levels, or create your own for everyone to play!'
        canonical={'https://thinky.gg'}
        openGraph={{
          title: 'Thinky - Play Thinking Puzzle Games Like Sokoban and Pathology',
          description: 'Thinky is a platform dedicated to high-quality puzzle games. Solve and optimize puzzles, search thousands of levels, or create your own for everyone to play!',
          type: 'website',
          url: 'https://thinky.gg',
        }}
      />
      <SoftwareAppJsonLd
        name='Thinky'
        price='0'
        priceCurrency='USD'
        applicationCategory='Game'
      />
      <Page
        style={{
          backgroundImage: 'url(https://i.imgur.com/iYIoTCx.png)',
          backgroundPosition: 'center',
          backgroundPositionY: 'calc(50% + ' + Dimensions.MenuHeight + 'px)',
          backgroundSize: 'cover',
          backgroundAttachment: 'fixed',
          backgroundRepeat: 'no-repeat',
        }}
        title='Thinky Puzzle Gaming'
      >
        <div className='flex flex-col justify-center items-center my-12 mx-6 gap-16'>
          <span
            className='text-6xl sm:text-8xl text-white rounded-lg text-center'
            style={{
              textShadow: '0 0 10px rgba(255,255,255,1)',
              animation: 'textShadow 0.5s ease-in-out infinite alternate, blurToClear 0.5s ease-in-out forwards',
              filter: 'blur(2px)',
            }}
          >
          Thinky.gg
          </span>
          <div className='flex flex-wrap justify-center gap-20 max-w-full'
            style={{
              animation: 'textShadow 1s ease-in-out infinite alternate, blurToClear 1s ease-in-out forwards',
              filter: 'blur(2px)',
            }}
          >
            {Object.values(Games).map(game => {
              if (game.id === GameId.THINKY) {
                return null;
              }

              return (
                <section className='flex flex-col items-center gap-6 max-w-full' key={`game-${game.id}`}>
                  <a
                    className='flex gap-3 items-center justify-center w-full py-4 px-5 border border-color-3 rounded-xl hover:scale-105 transition bg-1'
                    href={getUrl(game.id)}
                  >
                    <GameLogo gameId={game.id} id={game.id} size={36} />
                    <h2 className='font-semibold text-4xl'>{game.displayName}</h2>
                  </a>
                  <div className='flex flex-col items-center gap-3 text-center p-5 w-[280px] max-w-full rounded-xl h-full bg-1'>
                    <div className='flex h-60 w-60 max-w-full'>
                      <AnimatedGrid leastMoves={gameInstr[game.id].leastMoves} animationInstructions={gameInstr[game.id].instructions} game={game} theme={gameInstr[game.id].theme} id={'level-preview-' + game.id} levelData={gameInstr[game.id].data} />
                    </div>
                    <span>{game.shortDescription}</span>
                  </div>
                  <a
                    className='text-2xl font-bold px-5 py-3 border-2 border-color-3 rounded-xl hover:scale-105 transition w-fit text-center bg-1'
                    href={user ? getUrl(game.id, '/') : getUrl(game.id, '/tutorial')}
                    role='button'
                  >
                  Play Now
                  </a>
                </section>
              );
            })}
          </div>
          <div className='flex flex-wrap gap-12 mt-6 justify-center'>
            <FeatureCard
              description={<span>Create your <span className='font-bold'>own</span> levels and share them with the world.</span>}
              title='Level Editor'
              video='https://i.imgur.com/uc6ndtx.mp4'
            />
            <FeatureCard
              description='Compete against others.'
              title='Leaderboards'
              video='https://i.imgur.com/xWwF1XK.mp4'
            />
            <FeatureCard
              description='Rate and review levels.'
              title='Reviews'
              video='https://i.imgur.com/kbIOV9w.mp4'
            />
            <FeatureCard
              description='Play with friends in real-time.'
              title='Multiplayer'
              video='https://i.imgur.com/S1QJFso.mp4'
            />
            <FeatureCard
              description='Search, filter, and sort levels.'
              title='Advanced Search'
              video='https://i.imgur.com/GqCi1vV.mp4'
            />
            <FeatureCard
              description='Levels are automatically rated by difficulty.'
              title='Automatic Difficulty'
              video='https://i.imgur.com/y5M6nGk.mp4'
            />
            <FeatureCard
              description={<span>Unlock <span className='font-bold'>advanced</span> analytics, checkpoint saving, and tons more.</span>}
              title='Pro'
              video='https://i.imgur.com/nOJRkX1.mp4'
            />
          </div>
          <div className='flex flex-col gap-8 items-center'>
            {Object.values(Games).map(game => {
              if (game.id === GameId.THINKY) {
                return null;
              }

              return (
                <a
                  className='flex items-center gap-3 text-2xl font-bold px-5 py-3 border-2 border-color-3 rounded-xl hover:scale-105 transition w-fit text-center bg-1'
                  key={`game-${game.id}`}
                  href={user ? getUrl(game.id, '/') : getUrl(game.id, '/tutorial')}
                  role='button'
                >
                  <GameLogo gameId={game.id} id={game.id} size={28} />
                  <span>Play {game.displayName}</span>
                </a>
              );
            })}
          </div>
        </div>
      </Page>
    </>
  );
}
