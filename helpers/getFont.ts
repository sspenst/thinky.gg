import { GameId } from '@root/constants/GameId';
import { Nunito_Sans, Onest, Rubik, Teko } from 'next/font/google';

export const rubik = Rubik({ display: 'swap', subsets: ['latin'] });
export const teko = Teko({ display: 'swap', subsets: ['latin'], weight: '500' });
export const nunitoSans = Nunito_Sans({ display: 'swap', subsets: ['latin'] });
export const onest = Onest({ adjustFontFallback: false, display: 'swap', subsets: ['latin'] });

export default function getFontFromGameId(gameId: GameId) {
  switch (gameId) {
  case GameId.PATHOLOGY:
    return rubik.className;
  case GameId.SOKOBAN:
    return nunitoSans.className;
  default:
    return onest.className;
  }
}
