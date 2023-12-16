import { pathologySolveState, sokobanSolveState } from '@root/components/level/solutionStates/helpers';
import { GameState } from '@root/helpers/gameStateHelpers';
import validatePathologySolution from '@root/helpers/solutionValidators/validatePathologySolution';
import validateSokobanSolution from '@root/helpers/solutionValidators/validateSokobanSolution';
import Level from '@root/models/db/level';
import Direction from './direction';
import { GameId } from './GameId';
import Theme from './theme';

export enum GameType {
  SHORTEST_PATH = 'SHORTEST_PATH',
  NONE = 'NONE'

}

export const Games: Record<GameId, Game> = {
  [GameId.THINKY]: {
    id: GameId.THINKY,
    baseUrl: '',
    defaultTheme: Theme.Dark,
    displayName: 'Thinky.gg',
    disableCampaign: true,
    disableCommunityCampaigns: true,
    disableGames: true,
    disableTutorial: true,
    disableMultiplayer: true,
    disableRanked: true,
    favicon: '/logos/thinky/thinky.png',
    logo: '/logos/thinky/thinky.png',
    subtitle: 'Thinky Games',
    SEOTitle: 'Thinky Puzzle Games',
    SEODescription: 'Thinky Games is a collection of puzzle games',
    type: GameType.NONE,
    gameStateIsSolveFunction: pathologySolveState,
    validateSolutionFunction: validatePathologySolution,
  },
  [GameId.PATHOLOGY]: {
    id: GameId.PATHOLOGY,
    baseUrl: 'pathology.gg',
    defaultTheme: Theme.Modern,
    displayName: 'Pathology',
    favicon: '/logos/pathology/logo.svg',
    logo: '/logos/pathology/pathology.svg',
    subtitle: 'Find the way',
    SEOTitle: 'Pathology - Shortest Path Puzzle Game',
    SEODescription: 'The goal of Pathology is simple. Get to the exit in the least number of moves. Sounds easy right? Yet, this sokoban style game is one of the most mind-bending puzzle games you will find. Different blocks stand in your way to the exit, and your job is to figure out the optimal route',
    shortDescription: 'Get to the exit in the least number of moves',
    type: GameType.SHORTEST_PATH,
    videoDemo: 'https://i.imgur.com/bZpBEUW.mp4',
    gameStateIsSolveFunction: pathologySolveState,
    validateSolutionFunction: validatePathologySolution,
  },
  [GameId.SOKOBAN]: {
    id: GameId.SOKOBAN,
    baseUrl: 'sokoban.pathology.gg',
    disableCampaign: true,
    disableCommunityCampaigns: true,
    disableMultiplayer: true,
    disableRanked: true,
    defaultTheme: Theme.Winter,
    displayName: 'Sokoban',
    favicon: '/logos/sokoban/sokoban.webp',
    logo: '/logos/sokoban/sokoban.webp',
    SEOTitle: 'Sokoban - Push the boxes puzzle game',
    SEODescription: 'The goal of the puzzle game Sokoban is simple. Push the boxes onto the goals. Sounds easy right? Yet, this sokoban style game is one of the most mind-bending puzzle games you will find. The boxes can only be pushed, never pulled, and only one can be pushed at a time.',
    shortDescription: 'Push the boxes onto the goals',
    subtitle: 'Push the boxes',
    type: GameType.SHORTEST_PATH,
    videoDemo: 'https://i.imgur.com/7qGspht.mp4',
    gameStateIsSolveFunction: sokobanSolveState,
    validateSolutionFunction: validateSokobanSolution,
  },
};
export interface Game {
  id: GameId;
  baseUrl: string;
  defaultTheme: Theme;
  displayName: string;
  disableCampaign?: boolean;
  disableCommunityCampaigns?: boolean;
  disableGames?: boolean;
  disableTutorial?: boolean;
  disableMultiplayer?: boolean;
  disableRanked?: boolean,
  favicon?: string;
  logo: string;
  subtitle: string;
  SEOTitle: string;
  SEODescription: string;
  shortDescription?: string;
  type: GameType;
  videoDemo?: string;
  gameStateIsSolveFunction: (gameState: GameState) => boolean;
  validateSolutionFunction: (directions: Direction[], level: Level) => boolean;
}
