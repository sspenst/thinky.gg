import Footer from '@root/components/page/footer';
import Page from '@root/components/page/page';
import { GameId } from '@root/constants/GameId';
import { Game, Games } from '@root/constants/Games';
import { AppContext } from '@root/contexts/appContext';
import useUrl from '@root/hooks/useUrl';
import Image from 'next/image';
import React, { useContext } from 'react';
import { BannerLayer, Parallax, ParallaxBanner, ParallaxBannerLayer, ParallaxProvider } from 'react-scroll-parallax';

export default function ThinkyHomePage() {
  function GameCard({ game }: { game: Game }) {
    const getUrl = useUrl();

    return (
      <a suppressHydrationWarning href={getUrl(game.id)} className='flex flex-col gap-3 items-center justify-center w-full h-full p-4 border border-color-3 rounded-lg hover-bg-3 hover:scale-105 transition h-min w-min'>
        <Image src={game.logo} alt={game.displayName} width='128' height='128' className='w-32 h-32' style={{ minWidth: 128 }} />
        <span className='font-bold text-2xl'>{game.displayName}</span>
      </a>
    );
  }

  const getUrl = useUrl();
  const { userConfig, setShowNav } = useContext(AppContext);

  setShowNav(false);

  const subtext: BannerLayer = {
    translateY: [0, 30],

    opacity: [1, 0.3],

    scale: [2, 0.75, 'easeOutCubic'],
    shouldAlwaysCompleteAnimation: true,
    children: (
      <div className='absolute inset-0 flex items-center justify-center'>
        <h1 className='text-2xl md:text-6xl '>
          Puzzle games to make you think
        </h1>
      </div>
    ),
  };
  const background: BannerLayer = {
    image:
      'https://i.imgur.com/zqvfnh3.png',
    translateY: ['0%', '50%'],
    style: {
      backgroundImage: 'url(https://i.imgur.com/h2qnMrV.png)',
      // height: '100vh',
      // center
      backgroundPosition: 'center',

      backgroundSize: 'cover',

      backgroundAttachment: 'fixed',
      backgroundBlendMode: 'multiply',
      //background: 'linear-gradient(rgba(0,0,0,1), rgba(0,0,0,0)), url(https://i.imgur.com/h2qnMrV.png)',
      backgroundRepeat: 'no-repeat',

    },
    //opacity: [1, 0.3],

    //scale: [1.0, 1, 'easeOutCubic'],
    shouldAlwaysCompleteAnimation: true,
  };

  const background1: BannerLayer = {
    image:
      'https://i.imgur.com/h2qnMrV.png',
    translateY: [0, 50],

    //opacity: [1, 0.3],

    //scale: [1.0, 1, 'easeOutCubic'],
    shouldAlwaysCompleteAnimation: true,
  };

  const headline: BannerLayer = {
    translateY: ['0%', '20%'],
    scale: [1, 1.05, 'easeOutCubic'],
    shouldAlwaysCompleteAnimation: true,
    expanded: false,
    children: (
      <div className='justify-center flex flex-col items-center'>
        <h1 className='text-6xl md:text-8xl text-white font-thin bg-black p-3 rounded-lg'>
          Thinky.gg
        </h1>
        <div className='flex justify-center'>
          <div className='flex flex-row justify-center m-6 gap-24'>
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
      </div>
    ),
  };

  const midground: BannerLayer = {
    image:
      'https://i.imgur.com/ZMOHZMe.png',
    translateY: [30, 60, 'easeOutCubic'],

    shouldAlwaysCompleteAnimation: true,
  };

  const foreground: BannerLayer = {
    image:
      'https://i.imgur.com/0q38jR7.png',

    translateY: ['0%', '10%', 'easeOutCubic'],

    /** blur effect is on the css property  called filter */

    className: 'blur-[2px]',
    shouldAlwaysCompleteAnimation: true,
  };

  const gradientOverlay: BannerLayer = {
    opacity: [0, 0.59],
    shouldAlwaysCompleteAnimation: true,
    expanded: false,
    children: (
      <div className='absolute inset-0 bg-gradient-to-t from-gray-100 to-blue-900' />
    ),
  };

  let index = 0;

  function FeatureCard({ title, description, image }: {title: string, description: string | JSX.Element, image?: string}) {
    const banner: BannerLayer = {
      //translateX: [index + 0, 0 + 30 * index],
      //translateY: [index + 20, 30 * index],
      translateX: [(3.5 * 14) + '%', (0 + 14 * index) + '%'],
      translateY: ['20%', '20%'],
      startScroll: 600,
      endScroll: 1000,

      shouldAlwaysCompleteAnimation: true,
      children: <div className='h-40 w-40 rounded-xl p-4 border border-color-4 bg-gray-800'>
        <div className='font-bold text-lg'>{title}</div>
        <div className='text-sm'>
          {description}
        </div>
      </div> };

    index += 1;

    return banner;
  }

  return (
    <Page title='Thinky.gg'
      hideFooter
      style={{
        //     backgroundImage: 'url(https://i.imgur.com/h2qnMrV.png)',
        // height: '100vh',
        // center
        backgroundPosition: 'center',

        backgroundSize: 'cover',

        backgroundAttachment: 'fixed',
        backgroundBlendMode: 'multiply',
        //background: 'linear-gradient(rgba(0,0,0,1), rgba(0,0,0,0)), url(https://i.imgur.com/h2qnMrV.png)',
        backgroundRepeat: 'no-repeat',

      }}
    >
      <div className='flex flex-col justify-center items-center h-full'>
        <ParallaxProvider>
          <ParallaxBanner layers={[headline]} className='bg-gray-900' style={{
            height: '200vh',
          }} />
          <ParallaxBanner
            layers={[background, foreground, gradientOverlay, subtext]}
            className='bg-gray-900' style={{
              height: '50vh',

            }}
          />
          <div className='flex flex-col p-3 ' />
          <ParallaxBanner className='bg-gray-900 ' style={{
            height: '50vh',
          }}
          layers={[
            FeatureCard({
              title: 'Level Editor',
              description: (<div className='text-sm'>
              Create your <span className='font-bold'>own</span> levels and share them with the world.
              </div>),
            }),
            FeatureCard({
              title: 'Leaderboards',
              description: (<div className='text-sm'>
              Compete with others in challenges.
              </div>),
            }),

            FeatureCard({
              title: 'Reviews',
              description: (<div className='text-sm'>
              Rate and review levels.
              </div>),
            })
            ,

            FeatureCard({
              title: 'Multiplayer',
              description: (<div className='text-sm'>
              Play with friends in real-time.
              </div>),
            })
            ,

            FeatureCard({
              title: 'Advanced Search',
              description: (<div className='text-sm'>
              Search for levels by name, creator, or tags.
              </div>),
            })
            ,

            FeatureCard({
              title: 'Automatic difficulty',
              description: (<div className='text-sm'>
              Levels are automatically rated by difficulty.
              </div>),
            })
            ,

            FeatureCard({
              title: 'Pro',
              description: (<div className='text-sm'>
              Unlock <span className='font-bold'>advanced</span> analytics, checkpoint saving, and tons more.
              </div>),
            })
            ,
          ]}
          />
          <h2 className='text-4xl mt-3'>Features</h2>
        </ParallaxProvider>
        <div className='flex flex-col justify-center items-center h-full'>
          <Footer />
        </div>
      </div>
    </Page>
  );
}
