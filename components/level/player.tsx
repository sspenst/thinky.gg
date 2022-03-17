import { GameState } from './game';
import Movable from './movable';
import React from 'react';
import classNames from 'classnames';
import styles from './Player.module.css';

interface PlayerProps {
  gameState: GameState;
  leastMoves: number;
  padding: number;
  size: number;
}

export default function Player({ gameState, leastMoves, padding, size }: PlayerProps) {
  const innerSize = size - 2 * padding;
  const fontSize = gameState.moveCount >= 1000 ? innerSize / 3 : innerSize / 2;

  return (
    <Movable
      padding={padding}
      position={gameState.pos}
      size={size}
    >
      <div
        className={classNames(
          gameState.moveCount > leastMoves ? styles.extra : styles.default,
          gameState.endText === undefined ? undefined :
            gameState.moveCount > leastMoves ? styles.lose : styles.win
        )}
        style={{
          color: 'black',
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
