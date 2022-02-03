import { useCallback, useEffect, useState } from 'react';
import Block from './Block';
import BlockState from './BlockState';
import Color from './Color';
import Grid from './Grid';
import LevelDataType from './LevelDataType';
import Position from './Position';
import Square from './Square';
import SquareType from './SquareType';

export default function Game(props) {
  const goToLevelSelect = props.goToLevelSelect;
  const goToNextLevel = props.goToNextLevel;
  const leastMoves = props.level.leastMoves;

  const initGameState = useCallback(() => {
    const board = Array(props.dimensions.y).fill().map(() => new Array(props.dimensions.x).fill().map(() => new Square()));
    const blocks = [];
    let blockId = 0;
    let pos = undefined;
  
    for (let y = 0; y < props.dimensions.y; y++) {
      for (let x = 0; x < props.dimensions.x; x++) {
        const levelDataType = props.level.data[y * props.dimensions.x + x]
        switch (levelDataType) {
          case LevelDataType.Wall:
            board[y][x].squareType = SquareType.Wall;
            break;
          case LevelDataType.Block:
          case LevelDataType.Left:
          case LevelDataType.Up:
          case LevelDataType.Right:
          case LevelDataType.Down:
          case LevelDataType.Upleft:
          case LevelDataType.Upright:
          case LevelDataType.Downright:
          case LevelDataType.Downleft:
            blocks.push(new BlockState(blockId++, x, y, levelDataType));
            break;
          case LevelDataType.End:
            board[y][x].squareType = SquareType.End;
            board[y][x].text = leastMoves;
            break;
          case LevelDataType.Start:
            pos = new Position(x, y);
            break;
          case LevelDataType.Hole:
            board[y][x].squareType = SquareType.Hole;
            break;
          default:
            continue;
        }
      }
    }

    return {
      blocks: blocks,
      board: board,
      endText: undefined,
      move: 0,
      pos: pos,
      win: false,
    };
  }, [leastMoves, props.dimensions, props.level]);

  const [gameState, setGameState] = useState(initGameState());

  // set the state when the level updates
  useEffect(() => {
    setGameState(initGameState());
  }, [initGameState]);

  const handleKeyDown = useCallback(event => {
    // boundary checks
    function isPositionValid(pos) {
      return pos.x >= 0 && pos.x < props.dimensions.x && pos.y >= 0 && pos.y < props.dimensions.y;
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
        if (!prevGameState.blocks[blockIndex].canMove(newBlockPos) ||
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
      let win = prevGameState.win;

      if (prevGameState.board[newPos.y][newPos.x].squareType === SquareType.End) {
        if (newMove > leastMoves) {
          const extraMoves = newMove - leastMoves;
          console.log(extraMoves + ' away');
          endText = '+' + extraMoves;
        } else {
          // TODO: do something cool
          console.log('YOU WIN!!!');
          endText = leastMoves;
          win = true;
        }
      }

      return {
        blocks: prevGameState.blocks,
        board: prevGameState.board,
        endText: endText,
        move: newMove,
        pos: newPos,
        win: win,
      };
    });
  }, [goToLevelSelect, goToNextLevel, initGameState, leastMoves, props.dimensions]);

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
        text={gameState.endText}
        textColor={gameState.win ? Color.TextEndWin : Color.TextEndLose}
      />
      {getBlocks()}
      <Grid
        board={gameState.board}
        dimensions={props.dimensions}
        leastMoves={leastMoves}
        squareSize={props.squareSize}
      />
    </>
  );
}
