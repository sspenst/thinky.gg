import { useCallback, useEffect, useState } from 'react';
import React from 'react';
import Block from './Block';
import BlockState from '../Models/BlockState';
import Color from '../Constants/Color';
import Control from '../Models/Control';
import Grid from './Grid';
import Level from '../DataModels/Pathology/Level';
import LevelDataType from '../Constants/LevelDataType';
import Move from '../Models/Move';
import Position from '../Models/Position';
import SquareState from '../Models/SquareState';
import SquareType from '../Enums/SquareType';
import Controls from './Controls';

interface GameProps {
  controlSize: number;
  height: number;
  left: number;
  level: Level;
  squareSize: number;
  top: number;
  width: number;
}

export default function Game(props: GameProps) {
  const initGameState = useCallback(() => {
    const blocks: BlockState[] = [];
    const board = Array(props.level.height).fill(undefined).map(() =>
      new Array(props.level.width).fill(undefined).map(() =>
        new SquareState()));
    let blockId = 0;
    let endText: string | undefined;
    let moves: Move[] = [];
    let pos = new Position(0, 0);
  
    for (let y = 0; y < props.level.height; y++) {
      for (let x = 0; x < props.level.width; x++) {
        const levelDataType = props.level.data[y * props.level.width + x];

        if (levelDataType === LevelDataType.Wall) {
          board[y][x].squareType = SquareType.Wall;
        } else if (levelDataType === LevelDataType.End) {
          board[y][x].squareType = SquareType.End;
          board[y][x].text.push(props.level.leastMoves);
        } else if (levelDataType === LevelDataType.Hole) {
          board[y][x].squareType = SquareType.Hole;
        } else if (levelDataType === LevelDataType.Start) {
          pos = new Position(x, y);
        } else if (LevelDataType.canMove(levelDataType)) {
          blocks.push(new BlockState(blockId++, levelDataType, x, y));
        }
      }
    }

    return {
      blocks: blocks,
      board: board,
      endText: endText,
      moveCount: 0,
      moves: moves,
      pos: pos,
    };
  }, [props.level]);

  const [gameState, setGameState] = useState(initGameState());

  // set the state when the level updates
  useEffect(() => {
    setGameState(initGameState());
  }, [initGameState]);

  const handleKeyDown = useCallback(code => {
    function trackLevelMoves(levelId: string, moves: number) {
      fetch(process.env.REACT_APP_SERVICE_URL + 'moves', {
        method: 'PUT',
        body: JSON.stringify({
          levelId: levelId,
          moves: moves,
        }),
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      .then(res => {
        // TODO: notification here?
        console.log(res);
      })
      .catch(err => {
        console.error(err);
        alert('Error saving moves');
      });
    }

    // boundary checks
    function isPositionValid(pos: Position) {
      return pos.x >= 0 && pos.x < props.level.width && pos.y >= 0 && pos.y < props.level.height;
    }

    // can the player move to this position
    function isPlayerPositionValid(board: SquareState[][], pos: Position) {
      return isPositionValid(pos) && board[pos.y][pos.x].squareType !== SquareType.Wall &&
        board[pos.y][pos.x].squareType !== SquareType.Hole;
    }

    // can a block move to this position
    function isBlockPositionValid(board: SquareState[][], blocks: BlockState[], pos: Position) {
      return isPositionValid(pos) && board[pos.y][pos.x].squareType !== SquareType.Wall &&
        !isBlockAtPosition(blocks, pos);
    }

    function getBlockById(blocks: BlockState[], id: number) {
      for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].id === id) {
          return blocks[i];
        }
      }

      return undefined;
    }

    function getBlockIndexAtPosition(blocks: BlockState[], pos: Position) {
      for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].pos.equals(pos)) {
          return i;
        }
      }

      return -1;
    }

    function isBlockAtPosition(blocks: BlockState[], pos: Position) {
      return getBlockIndexAtPosition(blocks, pos) !== -1;
    }

    function updatePositionWithKey(pos: Position, code: string) {
      const newPos = pos.clone();

      // can use arrows or wasd to move
      if (code === 'ArrowLeft' || code === 'KeyA') {
        newPos.x -= 1;
      } else if (code === 'ArrowUp' || code === 'KeyW') {
        newPos.y -= 1;
      } else if (code === 'ArrowRight' || code === 'KeyD') {
        newPos.x += 1;
      } else if (code === 'ArrowDown' || code === 'KeyS') {
        newPos.y += 1;
      }

      return newPos;
    }

    function updateBlockPositionWithKey(block: BlockState, code: string) {
      const pos = updatePositionWithKey(block.pos, code);
      return block.canMoveTo(pos) ? pos : block.pos;
    }

    setGameState(prevGameState => {
      // restart
      if (code === 'KeyR') {
        return initGameState();
      }

      // lock movement once you reach the finish
      if (prevGameState.board[prevGameState.pos.y][prevGameState.pos.x].squareType === SquareType.End) {
        return prevGameState;
      }

      // treat prevGameState as immutable
      const blocks = prevGameState.blocks.map(block => block.clone());
      const board = prevGameState.board.map(row => {
        return row.map(square => square.clone());
      });
      const move = new Move(prevGameState.pos);
      const moves = prevGameState.moves.map(move => move.clone());

      // undo
      if (code === 'Backspace' || code === 'KeyU') {
        const prevMove = moves.pop();

        // nothing to undo
        if (prevMove === undefined) {
          return prevGameState;
        }

        // remove text only from the current position for smoother animations
        const text = board[prevGameState.pos.y][prevGameState.pos.x].text;

        // the text may not exist since it is only added when moving away from a position
        if (text[text.length - 1] === prevGameState.moveCount) {
          text.pop();
        }

        for (let i = 0; i < prevMove.blocks.length; i++) {
          const prevBlock = prevMove.blocks[i];
          const block = getBlockById(blocks, prevBlock.id);
          
          // if the block doesn't exist it was removed by a hole
          if (block === undefined) {
            blocks.push(prevBlock.clone());

            if (prevMove.holePos !== undefined) {
              board[prevMove.holePos.y][prevMove.holePos.x].squareType = SquareType.Hole;
            }
          } else {
            block.pos = prevBlock.pos.clone();
          }
        }

        return {
          blocks: blocks,
          board: board,
          endText: prevGameState.endText,
          moveCount: prevGameState.moveCount - 1,
          moves: moves,
          pos: prevMove.pos.clone(),
        };
      }

      const pos = updatePositionWithKey(prevGameState.pos, code);

      // if the position didn't change or the new position is invalid
      if (pos.equals(prevGameState.pos) || !isPlayerPositionValid(board, pos)) {
        return prevGameState;
      }

      const blockIndex = getBlockIndexAtPosition(blocks, pos);

      // if there is a block at the new position
      if (blockIndex !== -1) {
        const block = blocks[blockIndex];
        const blockPos = updateBlockPositionWithKey(block, code);

        // if the block position didn't change or the new position is invalid
        if (blockPos.equals(block.pos) || !isBlockPositionValid(board, blocks, blockPos)) {
          return prevGameState;
        }

        move.blocks.push(block.clone());
        
        // remove block if it is pushed onto a hole
        if (board[blockPos.y][blockPos.x].squareType === SquareType.Hole) {
          blocks.splice(blockIndex, 1);
          board[blockPos.y][blockPos.x].squareType = SquareType.Default;
          move.holePos = blockPos.clone();
        } else {
          block.pos = blockPos;
        }
      }

      const text = board[prevGameState.pos.y][prevGameState.pos.x].text;

      // save text if it doesn't already exist (may exist due to undo)
      if (text[text.length - 1] !== prevGameState.moveCount) {
        text.push(prevGameState.moveCount);
      }

      // save history from this move
      moves.push(move);

      let endText = prevGameState.endText;
      const moveCount = prevGameState.moveCount + 1;

      if (board[pos.y][pos.x].squareType === SquareType.End) {
        if (moveCount > props.level.leastMoves) {
          const extraMoves = moveCount - props.level.leastMoves;
          endText = '+' + extraMoves;
        } else {
          endText = String(moveCount);
        }

        trackLevelMoves(props.level._id, moveCount);
      }

      return {
        blocks: blocks,
        board: board,
        endText: endText,
        moveCount: moveCount,
        moves: moves,
        pos: pos,
      };
    });
  }, [initGameState, props.level]);

  const handleKeyDownEvent = useCallback(event => {
    const { code } = event;
    handleKeyDown(code);
  }, [handleKeyDown]);
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDownEvent);
    return () => document.removeEventListener('keydown', handleKeyDownEvent);
  }, [handleKeyDownEvent]);

  const [controls, setControls] = useState<Control[]>([]);

  useEffect(() => {
    setControls([
      new Control(() => handleKeyDown('KeyR'), 'Restart'),
      new Control(() => handleKeyDown('ArrowLeft'), 'Left'),
      new Control(() => handleKeyDown('ArrowUp'), 'Up'),
      new Control(() => handleKeyDown('ArrowDown'), 'Down'),
      new Control(() => handleKeyDown('ArrowRight'), 'Right'),
      new Control(() => handleKeyDown('Backspace'), 'Undo'),
    ]);
  }, [handleKeyDown, setControls]);

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
      <div style={{
        position: 'fixed',
        height: props.height,
        left: props.left,
        top: props.top,
        width: props.width,
      }}>
        <Block
          color={Color.Player}
          position={gameState.pos}
          size={props.squareSize}
          text={gameState.endText === undefined ? String(gameState.moveCount) : gameState.endText}
          textColor={
            gameState.moveCount > props.level.leastMoves ? Color.TextEndLose :
            gameState.endText === undefined ? Color.TextMove :
            gameState.moveCount < props.level.leastMoves ? Color.TextEndRecord : Color.TextEndWin}
          type={LevelDataType.Default}
        />
        {getBlocks()}
        <Grid
          board={gameState.board}
          level={props.level}
          squareSize={props.squareSize}
        />
      </div>
      <Controls
        controls={controls}
        controlSize={props.controlSize}
      />
    </>
  );
}
