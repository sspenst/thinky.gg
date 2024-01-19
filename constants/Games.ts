import { GameState } from '@root/helpers/gameStateHelpers';
import { isCompletePathology, isCompleteSokopath } from '@root/helpers/validators/isComplete';
import validatePathologySolution, { validatePathologyLevelValid as validatePathologyLevel } from '@root/helpers/validators/validatePathology';
import validateSokopathSolution, { validateSokopathLevel } from '@root/helpers/validators/validateSokopath';
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
    disableMultiplayer: true,
    disableRanked: true,
    disableTour: true,
    disableTutorial: true,
    displayName: 'Thinky.gg',
    favicon: '/logos/thinky/thinky.svg',
    hasPro: false,
    isNotAGame: true,
    logo: '/logos/thinky/thinky.svg',
    logoPng: '/logos/thinky/thinky_small.png',
    seoDescription: 'A platform dedicated to high-quality puzzle games',
    seoTitle: 'Thinky Puzzle Games',
    subdomain: undefined,
    subtitle: 'Thinky Games',
    type: GameType.NONE,
    isComplete: () => false,
  },
  [GameId.PATHOLOGY]: {
    id: GameId.PATHOLOGY,
    allowMovableOnExit: false,
    baseUrl: process.env.NODE_ENV !== 'development' ? `https://pathology.${APP_DOMAIN}` : 'http://pathology.localhost:3000',
    defaultTheme: Theme.Modern,
    displayName: 'Pathology',
    favicon: '/logos/pathology/pathology.svg',
    hasPro: true,
    logo: '/logos/pathology/pathology.svg',
    logoPng: '/logos/pathology/pathology.png',
    newLevelData: '4000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000003',
    seoDescription: 'The goal of Pathology is simple. Get to the exit in the least number of moves. Sounds easy right? Yet, this sokopath style game is one of the most mind-bending puzzle games you will find.',
    seoTitle: 'Pathology - The Shortest Path Puzzle Game',
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
    isComplete: isCompletePathology,
    validateLevel: validatePathologyLevel,
    validateSolution: validatePathologySolution,
  },
  [GameId.SOKOPATH]: {
    id: GameId.SOKOPATH,
    allowMovableOnExit: true,
    baseUrl: process.env.NODE_ENV !== 'development' ? `https://sokopath.${APP_DOMAIN}` : 'http://sokopath.localhost:3000',
    defaultTheme: Theme.Winter,
    disableCampaign: true,
    disableCommunityCampaigns: true,
    disableMultiplayer: true,
    disableRanked: true,
    disableTour: true,
    displayName: 'Sokopath',
    favicon: '/logos/sokopath/sokopath.svg',
    hasPro: true,
    logo: '/logos/sokopath/sokopath.svg',
    logoPng: '/logos/sokopath/sokopath.png',
    newLevelData: '40000\n00000\n00200\n00000\n00003',
    seoDescription: 'The goal of the puzzle game Sokopath is simple. Push the boxes onto the goals. Sounds easy right? Yet, this is one of the most mind-bending puzzle games you will find.',
    seoTitle: 'Sokopath - Push the Boxes Puzzle Game',
    shortDescription: 'Push the boxes onto the goals',
    stripeGiftPriceIdMonthly: process.env.STRIPE_GIFT_MONTHLY_PRICE_ID_SOKOBAN,
    stripeGiftPriceIdYearly: process.env.STRIPE_GIFT_YEARLY_PRICE_ID_SOKOBAN,
    stripePriceIdMonthly: process.env.STRIPE_MONTHLY_PRICE_ID_SOKOBAN,
    stripePriceIdYearly: process.env.STRIPE_YEARLY_PRICE_ID_SOKOBAN,
    stripePaymentLinkMonthly: process.env.STRIPE_PAYMENT_LINK_SOKOBAN,
    stripePaymentLinkYearly: process.env.STRIPE_PAYMENT_LINK_YEARLY_SOKOBAN,
    subdomain: 'sokopath',
    subtitle: 'Push the boxes',
    type: GameType.COMPLETE_AND_SHORTEST,
    isComplete: isCompleteSokopath,
    validateLevel: validateSokopathLevel,
    validateSolution: validateSokopathSolution,
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
  disableMultiplayer?: boolean;
  disableRanked?: boolean;
  disableTour?: boolean;
  disableTutorial?: boolean;
  displayName: string;
  favicon?: string;
  hasPro: boolean;
  isNotAGame?: boolean;
  logo: string;
  logoPng: string;
  newLevelData?: string;
  seoDescription: string;
  seoTitle: string;
  shortDescription?: string;
  stripePaymentLinkMonthly?: string;
  stripePaymentLinkYearly?: string;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  stripeGiftPriceIdMonthly?: string;
  stripeGiftPriceIdYearly?: string;
  subdomain: string | undefined;
  subtitle: string;
  type: GameType;
  isComplete: (gameState: GameState) => boolean;
  validateLevel?: (data: string) => ValidateLevelResponse;
  validateSolution?: (directions: Direction[], level: Level) => boolean;
}
