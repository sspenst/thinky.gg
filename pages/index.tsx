/* istanbul ignore file */
import Footer from '@root/components/page/footer';
import Page from '@root/components/page/page';
import { GameId } from '@root/constants/GameId';
import { Game, Games } from '@root/constants/Games';
import { AppContext } from '@root/contexts/appContext';
import useUrl from '@root/hooks/useUrl';
import Image from 'next/image';
import React, { useContext } from 'react';
import { BannerLayer, Parallax, ParallaxBanner, ParallaxProvider } from 'react-scroll-parallax';

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
      <div className='justify-center flex flex-col md:flex-row items-center'>
        <h1 className='text-6xl md:text-8xl text-white font-thin p-3 rounded-lg mt-10'>
          Thinky.gg
        </h1>
        <div className='flex justify-center'>
          <div className='flex flex-row justify-center p-10 md:mt-20 gap-1'>
            {Object.values(Games).map(game => {
              if (game.id === GameId.THINKY) {
                return null;
              }

              return (
                <div className='flex flex-col items-center gap-4' key={`game-${game.id}`}>
                  <GameCard game={game} />
                  <video autoPlay loop muted className='rounded-lg w-40 text-center' src={game.videoDemo} />
                  <div className='p-2 h-20 text-center text-md fadeIn trun'>
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
  const [targetElements, setTargetElements] = React.useState<HTMLElement[]>([]);

  React.useEffect(() => {
    const elements = document.querySelectorAll('.feature-line');
    const arr = Array.from(elements) as HTMLElement[];

    // append footer
    arr.push(document.querySelector('footer') as HTMLElement);
    setTargetElements(arr);
  }, []);

  function FeatureCardComp({ title, description, index, video }: {title: string, description: string | JSX.Element, index: number, video?: string}) {
    const targetElement = targetElements[index] ?? targetElements[index];

    return <Parallax

      translateX={['-200%', '0']}
      targetElement={targetElement}
      //startScroll={650 + index * 350}
      //endScroll={1000 + index * 350}
    >
      <div className='feature-line' style={{
        position: 'absolute',
        top: -400,
        left: 50,
        width: 10,
        height: 100,
        zIndex: 100,
        backgroundColor: 'var(--color-3)',

      }} />
      <div className='feature-card md:w-80 rounded-xl p-3 m-4 border border-color-4 bg-gray-800' style={{}}>
        <div className='font-bold text-lg'>{title}</div>
        <div className='text-sm'>
          {description}
          <div className='justify-center flex p-2'>
            <video autoPlay loop muted className='rounded-lg h-60 text-center' src={video} />
          </div>
        </div>
      </div>
    </Parallax>;
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
      <div className='flex flex-col justify-center items-center h-full '>
        <ParallaxProvider>
          <ParallaxBanner layers={[headline]} className='bg-gray-900' style={{
            height: '820px',
          }} />
          <ParallaxBanner
            layers={[background, foreground, gradientOverlay, subtext]}
            className='middle-section bg-gray-900' style={{
              height: '50vh',

            }}
          />
          <div className='flex flex-col gap-3 feature-area' />
          {FeatureCardComp({
            title: 'Level Editor',
            index: 0,
            description: (
              <div className='text-sm'>
              Create your <span className='font-bold'>own</span> levels and share them with the world.
              </div>),
            video: 'https://i.imgur.com/uc6ndtx.mp4',
          })}
          {
            FeatureCardComp({
              title: 'Leaderboards',
              index: 1,

              description: (<div className='text-sm'>
                Compete with others in challenges.
              </div>),
              video: 'https://i.imgur.com/xWwF1XK.mp4',
            })
          }
          {
            FeatureCardComp({
              title: 'Reviews',
              index: 2,

              description: (<div className='text-sm'>
                Rate and review levels.
              </div>),
              video: 'https://i.imgur.com/kbIOV9w.mp4',
            })
          }
          {FeatureCardComp({
            title: 'Multiplayer',
            index: 3,
            description: (<div className='text-sm'>
            Play with friends in real-time.
            </div>),
          })}
          {FeatureCardComp({
            title: 'Advanced Search',
            video: 'https://i.imgur.com/GqCi1vV.mp4',
            index: 4,
            description: (<div className='text-sm'>
            Search for levels by name, creator, or tags.
            </div>),
          })}
          {FeatureCardComp({
            title: 'Automatic difficulty',
            index: 5,
            description: (<div className='text-sm'>
              Levels are automatically rated by difficulty.
            </div>),
            video: 'https://i.imgur.com/y5M6nGk.mp4'
          })}
          {FeatureCardComp({
            title: 'Pro',
            index: 6,
            description: (<div className='text-sm'>
            Unlock <span className='font-bold'>advanced</span> analytics, checkpoint saving, and tons more.
            </div>),
          })}
          <Footer />
        </ParallaxProvider>

      </div>
    </Page>
  );
}
