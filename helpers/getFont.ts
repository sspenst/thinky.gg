import { GameId } from '@root/constants/GameId';
import { Game } from '@root/constants/Games';
import { Nunito_Sans, Pixelify_Sans, Rubik, Teko } from 'next/font/google';

export const rubik = Rubik({ display: 'swap', subsets: ['latin'] });
export const teko = Teko({ display: 'swap', subsets: ['latin'], weight: '500' });
export const pixelifySans = Pixelify_Sans({ display: 'swap', subsets: ['latin'] });
export const nunitoSans = Nunito_Sans({ display: 'swap', subsets: ['latin'] });

export default function getFontFromTheme(game: Game, theme?: string) {
  if (game.id === GameId.PATHOLOGY) {
    return rubik.className;
  } else if (game.id === GameId.SOKOBAN) {
    return pixelifySans.className;
  } else {
    return nunitoSans.className;
  }
}
