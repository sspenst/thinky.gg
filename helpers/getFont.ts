import { GameId } from '@root/constants/GameId';
import { Rubik, Teko } from 'next/font/google';

export const rubik = Rubik({ display: 'swap', subsets: ['latin'] });
export const teko = Teko({ display: 'swap', subsets: ['latin'], weight: '500' });

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function getFontFromGameId(gameId: GameId) {
  return rubik.className;

  // switch (gameId) {
  // case GameId.PATHOLOGY:
  //   return rubik.className;
  // case GameId.SOKOBAN:
  //   return nunitoSans.className;
  // default:
  //   return onest.className;
  // }
}
