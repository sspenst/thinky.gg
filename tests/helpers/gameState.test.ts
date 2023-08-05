import Direction from '@root/constants/direction';
import { areEqualGameStates, cloneGameState, initGameState, isValidGameState, makeMove, undo } from '@root/helpers/gameStateHelpers';

describe('helpers/gameStateHelpers.ts', () => {
  test('gameStateHelpers flow', () => {
    const initialGameState = initGameState('4000B0\n120000\n050000\n678900\nABCD30');
    let gameState = cloneGameState(initialGameState);

    // verify clone works
    expect(areEqualGameStates(gameState, initialGameState)).toBeTruthy();

    // nothing to undo
    expect(undo(gameState)).toBeFalsy();

    // move out of bounds
    expect(makeMove(gameState, Direction.LEFT, true)).toBeFalsy();

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
    expect(gameState.board[2][1].block).toBeFalsy();
    expect(gameState.board[2][1].blockInHole).toBeTruthy();

    // undo block in hole
    expect(undo(gameState)).toBeTruthy();
    expect(gameState.board[1][1].block).toBeTruthy();
    expect(gameState.board[2][1].blockInHole).toBeFalsy();

    // allow free undo
    expect(makeMove(gameState, Direction.DOWN)).toBeTruthy();
    expect(makeMove(gameState, Direction.RIGHT)).toBeTruthy();
    expect(makeMove(gameState, Direction.RIGHT)).toBeTruthy();
    expect(makeMove(gameState, Direction.LEFT, true)).toBeTruthy();
    expect(makeMove(gameState, Direction.LEFT, true)).toBeTruthy();
    expect(gameState.moves.length).toBe(2);
    expect(gameState.redoStack.length).toBe(2);

    // redo should pop once when retracing
    expect(makeMove(gameState, Direction.RIGHT)).toBeTruthy();
    expect(gameState.redoStack.length).toBe(1);

    // go to block and push it
    expect(makeMove(gameState, Direction.RIGHT)).toBeTruthy();
    expect(makeMove(gameState, Direction.UP)).toBeTruthy();
    expect(makeMove(gameState, Direction.RIGHT)).toBeTruthy();
    expect(gameState.moves.length).toBe(6);

    // push block into a wall
    const gameState2 = cloneGameState(gameState);

    expect(makeMove(gameState2, Direction.RIGHT)).toBeFalsy();

    // no free undo after pushing a block
    expect(makeMove(gameState, Direction.LEFT, true)).toBeTruthy();
    expect(gameState.board[0][4].block).toBeUndefined();
    expect(gameState.board[0][5].block).toBeDefined();

    // undo the block push
    expect(undo(gameState)).toBeTruthy();
    expect(undo(gameState)).toBeTruthy();
    expect(gameState.board[0][4].block).toBeDefined();
    expect(gameState.board[0][5].block).toBeUndefined();

    // go to the exit
    expect(makeMove(gameState, Direction.RIGHT)).toBeTruthy();
    expect(makeMove(gameState, Direction.DOWN)).toBeTruthy();
    expect(makeMove(gameState, Direction.DOWN)).toBeTruthy();
    expect(makeMove(gameState, Direction.DOWN)).toBeTruthy();
    expect(makeMove(gameState, Direction.DOWN)).toBeTruthy();
    expect(gameState.moves.length).toBe(10);

    // try to move off the exit
    expect(makeMove(gameState, Direction.RIGHT)).toBeFalsy();

    // validate gameState
    const isValid = isValidGameState(gameState);

    expect(isValid).toBeTruthy();
  });
});
