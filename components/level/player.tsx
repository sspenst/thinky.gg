import Color from '../../constants/color';
import { GameState } from './game';
import React from 'react';
import { useState } from 'react';

interface BlockProps {
  gameState: GameState;
  leastMoves: number;
  size: number;
}

export default function Player({ gameState, leastMoves, size }: BlockProps) {
  // initialize the block at the starting position to avoid an animation from the top left
  const [initPos] = useState(gameState.pos.clone());
  const color = gameState.moveCount > leastMoves ? Color.TextEndLose :
    gameState.endText === undefined ? Color.TextMove :
    gameState.moveCount < leastMoves ? Color.TextEndRecord : Color.TextEndWin;

  return (
    <div
      className={'cursor-default select-none'}
      style={{
        backgroundColor: Color.Player,
        color: color,
        fontSize: size / 2,
        height: size,
        left: size * initPos.x,
        lineHeight: size + 'px',
        position: 'absolute',
        textAlign: 'center',
        top: size * initPos.y,
        transform: `
          translateX(${(gameState.pos.x - initPos.x) * 100}%)
          translateY(${(gameState.pos.y - initPos.y) * 100}%)
        `,
        transition: 'transform 0.1s',
        verticalAlign: 'middle',
        width: size,
      }}
    >
      {gameState.endText === undefined ? String(gameState.moveCount) : gameState.endText}
    </div>
  );
}
