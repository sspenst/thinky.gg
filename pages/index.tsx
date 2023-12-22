import Page from '@root/components/page/page';
import { GameId } from '@root/constants/GameId';
import { Game, Games } from '@root/constants/Games';
import { AppContext } from '@root/contexts/appContext';
import useUrl from '@root/hooks/useUrl';
import Image from 'next/image';
import React, { useContext } from 'react';
import { BannerLayer, Parallax, ParallaxBanner, ParallaxBannerLayer, ParallaxProvider } from 'react-scroll-parallax';

function GameCard({ game }: { game: Game }) {
  const getUrl = useUrl();

  return (
    <a suppressHydrationWarning href={getUrl(game.id)} className='flex flex-col gap-3 items-center justify-center w-full h-full p-4 border border-color-3 rounded-lg hover-bg-3 hover:scale-105 transition h-min w-min'>
      <Image src={game.logo} alt={game.displayName} width='128' height='128' className='w-32 h-32' style={{ minWidth: 128 }} />
      <span className='font-bold text-2xl'>{game.displayName}</span>
    </a>
  );
}

const Component = () => {
  const owl: BannerLayer = {
    image:
      '/logos/thinky/thinky.svg',
    translateY: [0, 50],
    opacity: [1, 0.3],
    //scale: [1, 1, 'easeOutCubic'],
    shouldAlwaysCompleteAnimation: true,
    children: (
      <div className='absolute inset-0 flex items-center justify-center'>
        <h1 className='text-6xl md:text-8xl text-white font-thin'>
          Puzzle Games
        </h1>
      </div>
    ),
  };
  const background: BannerLayer = {
    image:
      'https://i.imgur.com/sYNZBrm.png',
    translateY: [0, 50],
    //opacity: [1, 0.3],
    //scale: [1.05, 1, 'easeOutCubic'],
    shouldAlwaysCompleteAnimation: true,
  };

  const headline: BannerLayer = {
    translateY: [0, 30],
    speed: 0.1,
    scale: [1, 1.05, 'easeOutCubic'],
    shouldAlwaysCompleteAnimation: true,
    expanded: false,
    children: (
      <div className='absolute inset-0 flex items-center justify-center'>
        <h1 className='text-6xl md:text-8xl text-white font-thin'>
          Thinky.gg
        </h1>
      </div>
    ),
  };

  const foreground: BannerLayer = {
    image:
      'https://s3-us-west-2.amazonaws.com/s.cdpn.io/105988/banner-foreground.png',
    translateY: [0, 15],
    scale: [1, 1.1, 'easeOutCubic'],
    shouldAlwaysCompleteAnimation: true,
  };

  const gradientOverlay: BannerLayer = {
    opacity: [0, 0.9],
    shouldAlwaysCompleteAnimation: true,
    expanded: false,
    children: (
      <div className='absolute inset-0 bg-gradient-to-t from-gray-900 to-blue-900' />
    ),
  };

  return (
    <ParallaxBanner
      layers={[owl, background, headline, foreground, gradientOverlay]}
      className='aspect-[2/1] bg-gray-900'
    />
  );
};

export default function ThinkyHomePage() {
  const getUrl = useUrl();
  const { userConfig, setShowNav } = useContext(AppContext);

  setShowNav(false);

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
        //background: 'linear-gradient(rgba(0,0,0,1), rgba(0,0,0,0)), url(https://i.imgur.com/h2qnMrV.png)',
        backgroundRepeat: 'no-repeat',
        height: '200vh',
      }}
    >
      <div className='flex flex-col justify-center items-center h-full'>
        <ParallaxProvider>

          <Component />
        </ParallaxProvider>
      </div>
    </Page>
  );
}
