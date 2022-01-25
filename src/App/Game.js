import './index.css';
import { useCallback, useEffect, useState } from 'react';
import Grid from './Grid';
import Position from "./Position";
import Block from './Block';

export default function Game(props) {
  function initGameState() {
    const text = Array(props.dimensions.y).fill().map(() => new Array(props.dimensions.x).fill());

    for (let i = 0; i < props.endsPos.length; i++) {
      text[props.endsPos[i].y][props.endsPos[i].x] = props.leastMoves;
    }

    return {
      blocksPos: props.blocksPos.map(blockPos => new Position(blockPos.x, blockPos.y)),
      move: 0,
      pos: props.startPos,
      text: text,
    };
  }

  const [gameState, setGameState] = useState(initGameState());

  // reset the board if you get to the end square or if you reach the least moves
  useEffect(() => {
    // TODO: update this with a list of dependencies once i've decided what to do
    // TODO: this happens instantly
    // should disable all inputs and force you to click a button in a popup to continue
    if (props.board[gameState.pos.y][gameState.pos.x] === 4 || gameState.move === props.leastMoves) {
      setGameState(initGameState());
    }
  });

  const handleKeyDown = useCallback(event => {
    function isPositionValid(pos) {
      // boundary checks
      if (pos.x < 0 || pos.x >= props.dimensions.x || pos.y < 0 || pos.y >= props.dimensions.y) {
        return false;
      }
  
      // can't move onto a wall
      if (props.board[pos.y][pos.x] === 1) {
        return false;
      }
  
      return true;
    }

    function getBlockAtPosition(blocksPos, pos) {
      for (let i = 0; i < blocksPos.length; i++) {
        if (blocksPos[i].x === pos.x && blocksPos[i].y === pos.y) {
          return i;
        }
      }

      return -1;
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
      const newPos = updatePositionWithKeyCode(prevGameState.pos, keyCode);

      // TODO: make an equality function
      if (newPos.x === prevGameState.pos.x && newPos.y === prevGameState.pos.y) {
        return prevGameState;
      }

      if (!isPositionValid(newPos)) {
        return prevGameState;
      }

      const blockIndex = getBlockAtPosition(prevGameState.blocksPos, newPos);

      // if there is a block at the position
      if (blockIndex !== -1) {
        const newBlockPos = updatePositionWithKeyCode(prevGameState.blocksPos[blockIndex], keyCode);

        if (!isPositionValid(newBlockPos) || getBlockAtPosition(prevGameState.blocksPos, newBlockPos) !== -1) {
          return prevGameState;
        }
        
        prevGameState.blocksPos[blockIndex] = newBlockPos;
      }

      prevGameState.text[prevGameState.pos.y][prevGameState.pos.x] = prevGameState.move;

      return {
        blocksPos: prevGameState.blocksPos,
        move: prevGameState.move + 1,
        pos: newPos,
        text: prevGameState.text,
      };
    });
  }, [props.board, props.dimensions]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  function getBlocks() {
    return gameState.blocksPos.map((blockPos, index) => <Block
      color='rgb(110, 80, 60)'
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
        gameState={gameState}
        squareSize={props.squareSize}
      />
    </>
  );
}
