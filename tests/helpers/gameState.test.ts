import Direction from '@root/constants/direction';
import { cloneGameState, initGameState, makeMove } from '@root/helpers/gameStateHelpers';

describe('helpers/gameStateHelpers.ts', () => {
  test('gameStateHelpers flow', () => {
    const initialGameState = initGameState('4000B0\n120000\n050000\n678900\nABCD30');
    let gameState = cloneGameState(initialGameState);

    // verify clone works
    expect(JSON.stringify(gameState)).toEqual(JSON.stringify(initialGameState));

    // move out of bounds
    expect(makeMove(gameState, Direction.LEFT)).toBeFalsy();

    // move into a wall
    gameState = cloneGameState(initialGameState);
    expect(makeMove(gameState, Direction.DOWN)).toBeFalsy();

    // make a valid move
    gameState = cloneGameState(initialGameState);
    expect(makeMove(gameState, Direction.RIGHT)).toBeTruthy();
    expect(gameState.moves.length).toBe(1);
    expect(gameState.pos.x).toBe(1);

    // push a block into a hole
    expect(makeMove(gameState, Direction.DOWN)).toBeTruthy();
    expect(gameState.moves.length).toBe(2);
    expect(gameState.blocks[1].inHole).toBeTruthy();

    // go to block and push it
    expect(makeMove(gameState, Direction.RIGHT)).toBeTruthy();
    expect(makeMove(gameState, Direction.RIGHT)).toBeTruthy();
    expect(makeMove(gameState, Direction.UP)).toBeTruthy();
    expect(makeMove(gameState, Direction.RIGHT)).toBeTruthy();
    expect(gameState.moves.length).toBe(6);

    // push block into a wall
    const gameState2 = cloneGameState(gameState);

    expect(makeMove(gameState2, Direction.RIGHT)).toBeFalsy();

    // go to the exit
    expect(makeMove(gameState, Direction.DOWN)).toBeTruthy();
    expect(makeMove(gameState, Direction.DOWN)).toBeTruthy();
    expect(makeMove(gameState, Direction.DOWN)).toBeTruthy();
    expect(makeMove(gameState, Direction.DOWN)).toBeTruthy();
    expect(gameState.moves.length).toBe(10);

    // try to move off the exit
    expect(makeMove(gameState, Direction.RIGHT)).toBeFalsy();
  });
});
