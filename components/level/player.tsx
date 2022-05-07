import { GameState } from './game';
import LevelDataType from '../../constants/levelDataType';
import Movable from './movable';
import React from 'react';
import classNames from 'classnames';
import styles from './Player.module.css';

interface PlayerProps {
  borderWidth: number;
  gameState: GameState;
  leastMoves: number;
  size: number;
}

export default function Player({ borderWidth, gameState, leastMoves, size }: PlayerProps) {
  const atEnd = gameState.board[gameState.pos.y][gameState.pos.x].levelDataType === LevelDataType.End;
  const innerSize = size - 2 * borderWidth;
  const text = String(gameState.moveCount);
  const fontSizeRatio = text.length <= 3 ? 2 : (1 + (text.length - 1) / 2);
  const fontSize = innerSize / fontSizeRatio;

  return (
    <Movable
      borderWidth={borderWidth}
      position={gameState.pos}
      size={size}
    >
      <div
        className={classNames(
          gameState.moveCount > leastMoves ? styles.extra : undefined,
          !atEnd ? undefined : gameState.moveCount > leastMoves ? styles.lose :
            document.body.className === 'theme-classic' ? styles['win-classic'] : styles.win,
          document.body.className === 'theme-classic' ? styles.classic : undefined,
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
