import classNames from 'classnames';
import React, { useState } from 'react';
import LevelDataType from '../../constants/levelDataType';
import Theme from '../../constants/theme';
import Position from '../../models/position';
import { GameState } from './game';
import styles from './Player.module.css';

interface PlayerProps {
  borderWidth: number;
  gameState: GameState;
  leastMoves: number;
  size: number;
}

export default function Player({ borderWidth, gameState, leastMoves, size }: PlayerProps) {
  // initialize the block at the starting position to avoid an animation from the top left
  const [initPos] = useState(new Position(gameState.pos.x, gameState.pos.y));

  const atEnd = gameState.board[gameState.pos.y][gameState.pos.x].levelDataType === LevelDataType.End;
  const classic = document.body.classList.contains(Theme.Classic);
  const innerSize = size - 2 * borderWidth;
  const text = String(gameState.moveCount);
  const fontSizeRatio = text.length <= 3 ? 2 : (1 + (text.length - 1) / 2);
  const fontSize = innerSize / fontSizeRatio;

  return (
    <div

      style={{
        transform: `translate(${(gameState.pos.x - initPos.x) * size}px, ${(gameState.pos.y - initPos.y) * size}px)`,
        transition: 'transform 0.1s',
      }}
    >
      <div id='player'
        className={classNames(
          'cursor-default select-none',
          leastMoves !== 0 && gameState.moveCount > leastMoves ? styles.extra : undefined,
          !atEnd ? undefined : leastMoves !== 0 && gameState.moveCount > leastMoves ? styles.lose :
            classic ? styles['win-classic'] : styles.win,
          classic ? styles.classic : undefined,
        )}
        style={{
          backgroundColor: 'var(--level-player)',
          borderColor: 'var(--bg-color)',
          borderWidth: classic ? `0 0 ${2 * borderWidth}px ${2 * borderWidth}px` : borderWidth,
          boxShadow: classic ? '0 0 0 1px var(--level-player-extra) inset' : '',
          color: 'var(--level-player-text)',
          fontSize: fontSize,
          height: size,
          left: size * initPos.x,
          lineHeight: innerSize + 'px',
          position: 'absolute',
          textAlign: 'center',
          top: size * initPos.y,
          verticalAlign: 'middle',
          width: size,
          zIndex: 2,
        }}
      >
        {text}
      </div>
    </div>
  );
}
