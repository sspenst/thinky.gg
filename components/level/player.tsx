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
  const text = gameState.endText === undefined ? String(gameState.moveCount) : gameState.endText;
  const fontSizeRatio = text.length <= 3 ? 2 : (1 + (text.length - 1) / 2);
  const fontSize = innerSize / fontSizeRatio;

  return (
    <Movable
      padding={padding}
      position={gameState.pos}
      size={size}
    >
      <div
        className={classNames(
          gameState.moveCount > leastMoves ? styles.extra : undefined,
          gameState.endText === undefined ? undefined :
            gameState.moveCount > leastMoves ? styles.lose : styles.win
        )}
        id={styles['default']}
        style={{
          fontSize: fontSize,
          height: innerSize,
          lineHeight: innerSize + 'px',
          width: innerSize,
        }}
      >
        {text}
      </div>
    </Movable>
  );
}
