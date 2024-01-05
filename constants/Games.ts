import { GameState } from '@root/helpers/gameStateHelpers';
import { isSolvedPathology, isSolvedSokoban } from '@root/helpers/validators/isSolved';
import validatePathologySolution, { validatePathologyLevelValid as validatePathologyLevel } from '@root/helpers/validators/validatePathology';
import validateSokobanSolution, { validateSokobanLevel } from '@root/helpers/validators/validateSokoban';
import Level from '@root/models/db/level';
import Direction from './direction';
import { GameId } from './GameId';
import Theme from './theme';

export enum GameType {
  COMPLETE_AND_SHORTEST = 'COMPLETE_AND_SHORTEST',
  SHORTEST_PATH = 'SHORTEST_PATH',
  NONE = 'NONE'
}
export const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'thinky.gg';

export const Games: Record<GameId, Game> = {
  [GameId.THINKY]: {
    id: GameId.THINKY,
    allowMovableOnExit: false,
    baseUrl: process.env.NODE_ENV !== 'development' ? `https://${APP_DOMAIN}` : 'http://localhost:3000',
    defaultTheme: Theme.Dark,
    disableCampaign: true,
    disableCommunityCampaigns: true,
    disableGames: true,
    disableMultiplayer: true,
    disableRanked: true,
    disableTour: true,
    disableTutorial: true,
    displayName: 'Thinky.gg',
    favicon: '/logos/thinky/thinky.svg',
    logo: '/logos/thinky/thinky.svg',
    SEOTitle: 'Thinky Puzzle Games',
    SEODescription: 'Thinky Games is a collection of puzzle games',
    subdomain: undefined,
    subtitle: 'Thinky Games',
    type: GameType.NONE,
    isSolved: () => false,
  },
  [GameId.PATHOLOGY]: {
    id: GameId.PATHOLOGY,
    allowMovableOnExit: false,
    baseUrl: process.env.NODE_ENV !== 'development' ? `https://pathology.${APP_DOMAIN}` : 'http://pathology.localhost:3000',
    defaultTheme: Theme.Modern,
    displayName: 'Pathology',
    favicon: '/logos/pathology/pathology.svg',
    logo: '/logos/pathology/pathology.svg',
    newLevelData: '4000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000003',
    SEOTitle: 'Pathology - Shortest Path Puzzle Game',
    SEODescription: 'The goal of Pathology is simple. Get to the exit in the least number of moves. Sounds easy right? Yet, this sokoban style game is one of the most mind-bending puzzle games you will find. Different blocks stand in your way to the exit, and your job is to figure out the optimal route',
    shortDescription: 'Get to the exit in the least number of moves',
    stripeGiftPriceIdMonthly: process.env.STRIPE_GIFT_MONTHLY_PRICE_ID,
    stripeGiftPriceIdYearly: process.env.STRIPE_GIFT_YEARLY_PRICE_ID,
    stripePriceIdMonthly: process.env.STRIPE_MONTHLY_PRICE_ID_PATHOLOGY,
    stripePriceIdYearly: process.env.STRIPE_YEARLY_PRICE_ID_PATHOLOGY,
    stripePaymentLinkMonthly: process.env.STRIPE_PAYMENT_LINK,
    stripePaymentLinkYearly: process.env.STRIPE_PAYMENT_LINK_YEARLY,
    subdomain: 'pathology',
    subtitle: 'Find the way',
    type: GameType.SHORTEST_PATH,
    isSolved: isSolvedPathology,
    validateLevel: validatePathologyLevel,
    validateSolution: validatePathologySolution,
  },
  [GameId.SOKOBAN]: {
    id: GameId.SOKOBAN,
    allowMovableOnExit: true,
    baseUrl: process.env.NODE_ENV !== 'development' ? `https://sokoban.${APP_DOMAIN}` : 'http://sokoban.localhost:3000',
    defaultTheme: Theme.Winter,
    disableCampaign: true,
    disableCommunityCampaigns: true,
    disableMultiplayer: true,
    disableRanked: true,
    disableTour: true,
    displayName: 'Sokoban',
    favicon: '/logos/sokoban/sokoban.svg',
    logo: '/logos/sokoban/sokoban.svg',
    newLevelData: '40000\n00000\n00200\n00000\n00003',
    SEOTitle: 'Sokoban - Push the boxes puzzle game',
    SEODescription: 'The goal of the puzzle game Sokoban is simple. Push the boxes onto the goals. Sounds easy right? Yet, this sokoban style game is one of the most mind-bending puzzle games you will find. The boxes can only be pushed, never pulled, and only one can be pushed at a time.',
    shortDescription: 'Push the boxes onto the goals',
    stripeGiftPriceIdMonthly: process.env.STRIPE_GIFT_MONTHLY_PRICE_ID_SOKOBAN,
    stripeGiftPriceIdYearly: process.env.STRIPE_GIFT_YEARLY_PRICE_ID_SOKOBAN,
    stripePriceIdMonthly: process.env.STRIPE_MONTHLY_PRICE_ID_SOKOBAN,
    stripePriceIdYearly: process.env.STRIPE_YEARLY_PRICE_ID_SOKOBAN,
    stripePaymentLinkMonthly: process.env.STRIPE_PAYMENT_LINK_SOKOBAN,
    stripePaymentLinkYearly: process.env.STRIPE_PAYMENT_LINK_YEARLY_SOKOBAN,
    subdomain: 'sokoban',
    subtitle: 'Push the boxes',
    type: GameType.COMPLETE_AND_SHORTEST,
    isSolved: isSolvedSokoban,
    validateLevel: validateSokobanLevel,
    validateSolution: validateSokobanSolution,
  },
};

export interface ValidateLevelResponse {
  reasons: string[];
  valid: boolean;
}

export interface Game {
  id: GameId;
  /**
   * If movables can start on exits
   */
  allowMovableOnExit: boolean;
  /**
   * Base URL for the game - only available on server side until we get NEXT_PUBLIC_APP_DOMAIN working
   */
  baseUrl: string;
  defaultTheme: Theme;
  disableCampaign?: boolean;
  disableCommunityCampaigns?: boolean;
  disableGames?: boolean;
  disableMultiplayer?: boolean;
  disableRanked?: boolean;
  disableTour?: boolean;
  disableTutorial?: boolean;
  displayName: string;
  favicon?: string;
  logo: string;
  newLevelData?: string;
  subtitle: string;
  SEOTitle: string;
  SEODescription: string;
  shortDescription?: string;
  stripePaymentLinkMonthly?: string;
  stripePaymentLinkYearly?: string;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  stripeGiftPriceIdMonthly?: string;
  stripeGiftPriceIdYearly?: string;
  subdomain: string | undefined;
  type: GameType;
  isSolved: (gameState: GameState) => boolean;
  validateLevel?: (data: string) => ValidateLevelResponse;
  validateSolution?: (directions: Direction[], level: Level) => boolean;
}
