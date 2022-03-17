import Color from '../../constants/color';
import { GameState } from './game';
import Movable from './movable';
import React from 'react';

interface PlayerProps {
  gameState: GameState;
  leastMoves: number;
  padding: number;
  size: number;
}

export default function Player({ gameState, leastMoves, padding, size }: PlayerProps) {
  const color = gameState.moveCount > leastMoves ? Color.TextEndLose :
    gameState.endText === undefined ? Color.TextMove :
    gameState.moveCount < leastMoves ? Color.TextEndRecord : Color.TextEndWin;
  const innerSize = size - 2 * padding;
  const fontSize = gameState.moveCount >= 1000 ? innerSize / 3 : innerSize / 2;

  return (
    <Movable
      padding={padding}
      position={gameState.pos}
      size={size}
    >
      <div
        style={{
          backgroundColor: Color.Player,
          color: color,
          fontSize: fontSize,
          height: innerSize,
          lineHeight: innerSize + 'px',
          textAlign: 'center',
          verticalAlign: 'middle',
          width: innerSize,
        }}
      >
        {gameState.endText === undefined ? String(gameState.moveCount) : gameState.endText}
      </div>
    </Movable>
  );
}
