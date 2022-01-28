import { useCallback, useEffect, useState } from 'react';
import Block from './Block';
import Grid from './Grid';
import Position from './Position';
import SquareType from './SquareType';

export default function Game(props) {
  const initGameState = useCallback(() => {
    const text = Array(props.dimensions.y).fill().map(() => new Array(props.dimensions.x).fill());

    for (let i = 0; i < props.endsPos.length; i++) {
      text[props.endsPos[i].y][props.endsPos[i].x] = props.leastMoves;
    }

    return {
      blocksPos: props.blocksPos.map(blockPos => new Position(blockPos.x, blockPos.y)),
      lockedBlocks: new Set(), // indices of blocks that are impossible to move
      move: 0,
      pos: new Position(props.startPos.x, props.startPos.y),
      text: text,
    };
  }, [props.blocksPos, props.dimensions, props.endsPos, props.leastMoves, props.startPos]);

  const [gameState, setGameState] = useState(initGameState());

  const handleKeyDown = useCallback(event => {
    function isPositionValid(pos) {
      // boundary checks
      if (pos.x < 0 || pos.x >= props.dimensions.x || pos.y < 0 || pos.y >= props.dimensions.y) {
        return false;
      }
  
      // can't move onto a wall
      if (props.board[pos.y][pos.x] === SquareType.Wall) {
        return false;
      }
  
      return true;
    }

    function getBlockIndexAtPosition(blocksPos, pos) {
      for (let i = 0; i < blocksPos.length; i++) {
        if (Position.equal(blocksPos[i], pos)) {
          return i;
        }
      }

      return -1;
    }

    function isBlockAtPosition(blocksPos, pos) {
      return getBlockIndexAtPosition(blocksPos, pos) !== -1;
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

    setGameState(prevGameState => {
      // restart with r
      if (keyCode === 82) {
        return initGameState();
      }

      // lock movement once you reach the finish
      if (props.board[prevGameState.pos.y][prevGameState.pos.x] === SquareType.End) {
        return prevGameState;
      }

      const newPos = updatePositionWithKeyCode(prevGameState.pos, keyCode);

      // if the position didn't change or the new position is invalid
      if (Position.equal(newPos, prevGameState.pos) || !isPositionValid(newPos)) {
        return prevGameState;
      }

      const blockIndex = getBlockIndexAtPosition(prevGameState.blocksPos, newPos);

      // if there is a block at the new position
      if (blockIndex !== -1) {
        const newBlockPos = updatePositionWithKeyCode(prevGameState.blocksPos[blockIndex], keyCode);

        // can't push a block onto a wall or another block
        if (!isPositionValid(newBlockPos) || isBlockAtPosition(prevGameState.blocksPos, newBlockPos)) {
          return prevGameState;
        }
        
        prevGameState.blocksPos[blockIndex] = newBlockPos;
      }

      prevGameState.text[prevGameState.pos.y][prevGameState.pos.x] = prevGameState.move;
      const newMove = prevGameState.move + 1;

      if (props.board[newPos.y][newPos.x] === SquareType.End) {
        if (newMove > props.leastMoves) {
          const extraMoves = newMove - props.leastMoves;
          console.log(extraMoves + ' away');
        } else {
          // TODO: do something cool
          console.log('YOU WIN!!!');
        }
      }

      return {
        blocksPos: prevGameState.blocksPos,
        lockedBlocks: prevGameState.lockedBlocks,
        move: newMove,
        pos: newPos,
        text: prevGameState.text,
      };
    });
  }, [props.board, props.dimensions, props.leastMoves, initGameState]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  function getBlocks() {
    return gameState.blocksPos.map((blockPos, index) => <Block
      color={gameState.lockedBlocks.has(index) ? 'rgb(38, 38, 38)' : 'rgb(110, 80, 60)'}
      key={index}
      position={blockPos}
      squareSize={props.squareSize}
    />);
  }

  return (
    <>
      <Block
        color='rgb(244, 114, 182)'
        position={gameState.pos}
        squareSize={props.squareSize}
      />
      {getBlocks()}
      <Grid
        board={props.board}
        dimensions={props.dimensions}
        leastMoves={props.leastMoves}
        squareSize={props.squareSize}
        text={gameState.text}
      />
    </>
  );
}
