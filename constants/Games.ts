import { pathologySolveState, sokobanSolveState } from '@root/components/level/solutionStates/helpers';
import { GameState } from '@root/helpers/gameStateHelpers';
import validatePathologySolution from '@root/helpers/solutionValidators/validatePathologySolution';
import validateSokobanSolution from '@root/helpers/solutionValidators/validateSokobanSolution';
import Level from '@root/models/db/level';
import Direction from './direction';
import { GameId } from './GameId';

export enum GameType {
  SHORTEST_PATH = 'SHORTEST_PATH',
  NONE = 'NONE'

}
export const Games: Record<GameId, Game> = {
  [GameId.GLOBAL]: {
    id: GameId.GLOBAL,
    baseUrl: '',
    displayName: 'Global',
    subtitle: 'Global Subtitle',
    SEOTitle: 'Global - Global Title',
    SEODescription: 'Global Short Description',
    type: GameType.NONE,
    gameStateIsSolveFunction: pathologySolveState,
    validateSolutionFunction: validatePathologySolution,
  },
  [GameId.PATHOLOGY]: {
    id: GameId.PATHOLOGY,
    baseUrl: 'pathology.gg',
    displayName: 'Pathology',
    subtitle: 'Find the way',
    SEOTitle: 'Pathology - Shortest Path Puzzle Game',
    SEODescription: 'The goal of Pathology is simple. Get to the exit in the least number of moves. Sounds easy right? Yet, this sokoban style game is one of the most mind-bending puzzle games you will find. Different blocks stand in your way to the exit, and your job is to figure out the optimal route',
    type: GameType.SHORTEST_PATH,
    //
    gameStateIsSolveFunction: pathologySolveState,
    validateSolutionFunction: validatePathologySolution,
  },
  [GameId.SOKOBAN]: {
    id: GameId.SOKOBAN,
    baseUrl: 'sokoban.pathology.gg',
    displayName: 'Sokoban',
    SEOTitle: 'Sokoban - Push the boxes puzzle game',
    SEODescription: 'The goal of the puzzle game Sokoban is simple. Push the boxes onto the goals. Sounds easy right? Yet, this sokoban style game is one of the most mind-bending puzzle games you will find. The boxes can only be pushed, never pulled, and only one can be pushed at a time.',
    subtitle: 'Push the boxes',
    type: GameType.SHORTEST_PATH,
    //
    gameStateIsSolveFunction: sokobanSolveState,
    validateSolutionFunction: validateSokobanSolution
  },
};
export interface Game {
  id: GameId;
  baseUrl: string;
  displayName: string;
  subtitle: string;
  SEOTitle: string;
  SEODescription: string;
  type: GameType;
//
gameStateIsSolveFunction: (gameState: GameState) => boolean;
validateSolutionFunction: (directions: Direction[], level: Level) => boolean;
}
