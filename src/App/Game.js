import { useCallback, useEffect, useState } from 'react';
import Block from './Block';
import BlockState from '../Models/BlockState';
import Color from '../Constants/Color';
import Grid from './Grid';
import LevelDataHelper from '../Helpers/LevelDataHelper';
import LevelDataType from '../Constants/LevelDataType';
import Position from '../Models/Position';
import Square from '../Models/Square';
import SquareType from '../Constants/SquareType';

export default function Game(props) {
  // need to destructure props to use functions in a callback
  const goToLevelSelect = props.goToLevelSelect;
  const goToNextLevel = props.goToNextLevel;

  const initGameState = useCallback(() => {
    const board = Array(props.level.height).fill().map(() => new Array(props.level.width).fill().map(() => new Square()));
    const blocks = [];
    let blockId = 0;
    let pos = undefined;
  
    for (let y = 0; y < props.level.height; y++) {
      for (let x = 0; x < props.level.width; x++) {
        const levelDataType = props.level.data[y * props.level.width + x]

        if (levelDataType === LevelDataType.Wall) {
          board[y][x].squareType = SquareType.Wall;
        } else if (levelDataType === LevelDataType.End) {
          board[y][x].squareType = SquareType.End;
          board[y][x].text = props.level.leastMoves;
        } else if (levelDataType === LevelDataType.Hole) {
          board[y][x].squareType = SquareType.Hole;
        } else if (levelDataType === LevelDataType.Start) {
          pos = new Position(x, y);
        } else if (LevelDataHelper.canMove(levelDataType)) {
          blocks.push(new BlockState(blockId++, x, y, levelDataType));
        }
      }
    }

    return {
      blocks: blocks,
      board: board,
      endText: undefined,
      move: 0,
      pos: pos,
    };
  }, [props.level]);

  const [gameState, setGameState] = useState(initGameState());

  // set the state when the level updates
  useEffect(() => {
    setGameState(initGameState());
  }, [initGameState]);

  const handleKeyDown = useCallback(event => {
    // boundary checks
    function isPositionValid(pos) {
      return pos.x >= 0 && pos.x < props.level.width && pos.y >= 0 && pos.y < props.level.height;
    }

    // can the player move to this position
    function isPlayerPositionValid(board, pos) {
      return isPositionValid(pos) && board[pos.y][pos.x].squareType !== SquareType.Wall &&
        board[pos.y][pos.x].squareType !== SquareType.Hole;
    }

    // can a block move to this position
    function isBlockPositionValid(board, blocks, pos) {
      return isPositionValid(pos) && board[pos.y][pos.x].squareType !== SquareType.Wall &&
        !isBlockAtPosition(blocks, pos);
    }

    function getBlockIndexAtPosition(blocks, pos) {
      for (let i = 0; i < blocks.length; i++) {
        if (Position.equal(blocks[i].pos, pos)) {
          return i;
        }
      }

      return -1;
    }

    function isBlockAtPosition(blocks, pos) {
      return getBlockIndexAtPosition(blocks, pos) !== -1;
    }

    function updatePositionWithKeyCode(pos, keyCode) {
      const newPos = new Position(pos.x, pos.y);

      // can use arrows or wasd to move
      if (keyCode === 37 || keyCode === 65) {
        newPos.x -= 1;
      } else if (keyCode === 38 || keyCode === 87) {
        newPos.y -= 1;
      } else if (keyCode === 39 || keyCode === 68) {
        newPos.x += 1;
      } else if (keyCode === 40 || keyCode === 83) {
        newPos.y += 1;
      }

      return newPos;
    }
    
    const { keyCode } = event;

    // return to level select with esc
    if (keyCode === 27) {
      goToLevelSelect();
      return;
    }

    // press enter to go to the next level
    if (keyCode === 13) {
      goToNextLevel();
      return;
    }

    setGameState(prevGameState => {
      // restart with r
      if (keyCode === 82) {
        return initGameState();
      }

      // lock movement once you reach the finish
      if (prevGameState.board[prevGameState.pos.y][prevGameState.pos.x].squareType === SquareType.End) {
        return prevGameState;
      }

      const newPos = updatePositionWithKeyCode(prevGameState.pos, keyCode);

      // if the position didn't change or the new position is invalid
      if (Position.equal(newPos, prevGameState.pos) || !isPlayerPositionValid(prevGameState.board, newPos)) {
        return prevGameState;
      }

      const blockIndex = getBlockIndexAtPosition(prevGameState.blocks, newPos);

      // if there is a block at the new position
      if (blockIndex !== -1) {
        const newBlockPos = updatePositionWithKeyCode(prevGameState.blocks[blockIndex].pos, keyCode);

        // check if block is allowed to move to new position
        if (!prevGameState.blocks[blockIndex].canMoveTo(newBlockPos) ||
          !isBlockPositionValid(prevGameState.board, prevGameState.blocks, newBlockPos)) {
          return prevGameState;
        }
        
        // remove block if it is pushed onto a hole
        if (prevGameState.board[newBlockPos.y][newBlockPos.x].squareType === SquareType.Hole) {
          prevGameState.blocks.splice(blockIndex, 1);
          prevGameState.board[newBlockPos.y][newBlockPos.x].squareType = SquareType.Default;
        } else {
          prevGameState.blocks[blockIndex].pos = newBlockPos;
        }
      }

      prevGameState.board[prevGameState.pos.y][prevGameState.pos.x].text = prevGameState.move;
      const newMove = prevGameState.move + 1;
      let endText = prevGameState.endText;

      if (prevGameState.board[newPos.y][newPos.x].squareType === SquareType.End) {
        if (newMove > props.level.leastMoves) {
          const extraMoves = newMove - props.level.leastMoves;
          endText = '+' + extraMoves;
        } else {
          endText = newMove;
        }
      }

      return {
        blocks: prevGameState.blocks,
        board: prevGameState.board,
        endText: endText,
        move: newMove,
        pos: newPos,
      };
    });
  }, [goToLevelSelect, goToNextLevel, initGameState, props.level]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  function getBlocks() {
    return gameState.blocks.map(block => <Block
      color={Color.Block}
      key={block.id}
      position={block.pos}
      size={props.squareSize}
      type={block.type}
    />);
  }

  return (
    <>
      <Block
        color={Color.Player}
        position={gameState.pos}
        size={props.squareSize}
        text={gameState.endText === undefined ? gameState.move : gameState.endText}
        textColor={
          gameState.move > props.level.leastMoves ? Color.TextEndLose :
          gameState.endText === undefined ? Color.TextMove :
          gameState.move < props.level.leastMoves ? Color.TextEndRecord : Color.TextEndWin}
      />
      {getBlocks()}
      <Grid
        board={gameState.board}
        level={props.level}
        squareSize={props.squareSize}
      />
    </>
  );
}
