/* istanbul ignore file */
import AnimatedGrid from '@root/components/level/animatedGrid';
import Grid from '@root/components/level/grid';
import Footer from '@root/components/page/footer';
import Page from '@root/components/page/page';
import Direction from '@root/constants/direction';
import { GameId } from '@root/constants/GameId';
import { Game, Games } from '@root/constants/Games';
import Theme from '@root/constants/theme';
import { AppContext } from '@root/contexts/appContext';
import { initGameState } from '@root/helpers/gameStateHelpers';
import useUrl from '@root/hooks/useUrl';
import Image from 'next/image';
import React, { useContext } from 'react';

export default function ThinkyHomePage() {
  const getUrl = useUrl();

  function GameCard({ game }: { game: Game }) {
    return (
      <a suppressHydrationWarning href={getUrl(game.id)} className='flex flex-col gap-3 items-center justify-center w-full h-full p-4 border border-color-3 rounded-lg hover-bg-3 hover:scale-105 transition h-min w-min'
        style={{
          backgroundColor: 'rgba(0,0,0,0.666)',
        }}>
        <Image src={game.logo} alt={game.displayName} width='128' height='128' className='w-32 h-32' style={{ minWidth: 128 }} />
        <span className='font-bold text-2xl'>{game.displayName}</span>
      </a>
    );
  }

  const { userConfig, setShowNav } = useContext(AppContext);

  setShowNav(false);

  // const background1: BannerLayer = {
  //   image:
  //     'https://i.imgur.com/h2qnMrV.png',
  //   translateY: [0, 50],

  //   //opacity: [1, 0.3],

  //   //scale: [1.0, 1, 'easeOutCubic'],
  //   shouldAlwaysCompleteAnimation: true,
  // };
  const strMap = {
    'u': Direction.UP,
    'd': Direction.DOWN,
    'l': Direction.LEFT,
    'r': Direction.RIGHT,
    'X': Direction.NONE,
  } as {[key: string]: Direction};
  const gameInstr = {
    [GameId.SOKOBAN]: {
      data: '0000\n0130\n0220\n0003',
      leastMoves: 14,
      theme: Theme.Winter,
      instructions: 'ddddrrudllurrlluurrrddXrrdduullddrdruX'.split('').map(x => strMap[x]),
    },
    [GameId.PATHOLOGY]: {
      data: '0004\n2221\n0001\n1013\n0000',
      leastMoves: 13,
      instructions: 'lllldurrdldddrruXldulldrdddrruX'.split('').map(x => strMap[x]),
      theme: Theme.Classic
    },
  };
  const ThinkyH1Text = (
    <h1 className='text-6xl md:text-8xl text-white font-thin p-3 rounded-lg mt-10 text-center'>
          Thinky.gg
    </h1>
  );

  const [targetElements, setTargetElements] = React.useState<HTMLElement[]>([]);

  React.useEffect(() => {
    const elements = document.querySelectorAll('.feature-line');
    const arr = Array.from(elements) as HTMLElement[];

    // append footer
    arr.push(document.querySelector('footer') as HTMLElement);
    setTargetElements(arr);
  }, []);

  function FeatureCardComp({ title, description, index, video }: {title: string, description: string | JSX.Element, index: number, video?: string}) {
  //  const targetElement = targetElements[index] ?? targetElements[index];

    return <div className='feature-card md:w-80 rounded-xl p-3 m-4 border border-color-4 bg-gray-800' style={{}}>
      <div className='font-bold text-lg'>{title}</div>
      <div className='text-sm'>
        {description}
        <div className='justify-center flex p-2'>
          <video autoPlay loop muted className='rounded-lg h-60 text-center' src={video} />
        </div>
      </div>
    </div>;
  }

  return (
    <Page title='Thinky.gg'
      hideFooter
      style={{
        backgroundImage: 'url(https://i.imgur.com/h2qnMrV.png)',
        // height: '100vh',
        // center
        backgroundPosition: 'center',

        backgroundSize: 'cover',

        backgroundAttachment: 'fixed',
        backgroundBlendMode: 'multiply',
        background: 'linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0), rgba(0,0,0,0.7)), url(https://i.imgur.com/h2qnMrV.png)',

        backgroundRepeat: 'no-repeat',

      }}
    >
      <div className='flex flex-col justify-center items-center  '>

        <div className='justify-center flex flex-col md:flex-row items-center'>
          <div className='flex flex-col justify-center'>
            {ThinkyH1Text}
            <div className='flex flex-row justify-center p-4 gap-1'>
              {Object.values(Games).map(game => {
                if (game.id === GameId.THINKY) {
                  return null;
                }

                return (
                  <div className='flex flex-col items-center gap-4' key={`game-${game.id}`}>
                    <GameCard game={game} />
                    <div className='flex h-40 w-40 bg-1 p-3 rounded-md'>
                      <AnimatedGrid leastMoves={gameInstr[game.id].leastMoves} animationInstructions={gameInstr[game.id].instructions} game={game} theme={gameInstr[game.id].theme} id={'level-preview-' + game.id} levelData={gameInstr[game.id].data} />
                    </div>
                    <div className='p-2 text-center text-lg fadeIn trun '>
                      {game.shortDescription}
                    </div>
                    <a
                      className='text-2xl font-bold px-4 py-3 border-2 border-color-3 rounded-lg hover-bg-3 hover:scale-110 transition'
                      style={{
                        backgroundColor: 'rgba(0,0,0,0.666)',
                      }}
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
        <div className='flex flex-wrap md:ml-40 md:mr-40 justify-center' style={{
        }}>
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
        </div>
        <Footer />

      </div>
    </Page>
  );
}
