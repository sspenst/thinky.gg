import { GameId } from '@root/constants/GameId';
import { Games } from '@root/constants/Games';
import Image from 'next/image';
import React from 'react';

export function getGameLogo(game: GameId) {
  const logo = Games[game].logo;

  return <Image alt='logo' src={logo} width='24' height='24' className='h-6 w-6' />;
}
