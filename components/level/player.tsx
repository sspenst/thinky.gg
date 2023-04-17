import { AppContext } from '@root/contexts/appContext';
import classNames from 'classnames';
import React, { useContext, useState } from 'react';
import Theme, { getIconFromTheme } from '../../constants/theme';
import TileType from '../../constants/tileType';
import isTheme from '../../helpers/isTheme';
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
  const tileType = gameState.board[gameState.pos.y][gameState.pos.x].levelDataType;
  const atEnd = tileType === TileType.End;
  const classic = isTheme(Theme.Classic);
  const innerSize = size - 2 * borderWidth;
  const text = String(gameState.moveCount);
  const fontSizeRatio = text.length <= 3 ? 2 : (1 + (text.length - 1) / 2);
  const fontSize = innerSize / fontSizeRatio;
  const { user } = useContext(AppContext);
  const theme = user?.config.theme;
  const parentStyle = {
    backgroundColor: 'var(--bg-color)',
    height: size,
    left: size * initPos.x + (classic ? 2 * borderWidth : borderWidth),
    top: size * initPos.y + (classic ? 0 : borderWidth),
    transform: `translate(${(gameState.pos.x - initPos.x) * size}px, ${(gameState.pos.y - initPos.y) * size}px)`,
    transition: 'transform 0.1s',
    width: size,
  };
  const icon = getIconFromTheme(theme, TileType.Start);

  if (icon) {
    const overstepped = leastMoves !== 0 && gameState.moveCount > leastMoves;

    return <div
      className='absolute'
      style={parentStyle}
    >
      <div
        className={classNames(
          'cursor-default select-none z-20',
          overstepped ? styles.extra : undefined,
          !atEnd ? undefined : leastMoves !== 0 && gameState.moveCount > leastMoves ? styles.lose :
            classic ? styles['win-classic'] : styles.win,
          classic ? styles.classic : undefined,
        )}
        id='player'
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          backgroundColor: 'var(--level-player)',
          borderColor: 'var(--level-player-extra)',
          borderWidth: classic ? 1 : 0,
          boxShadow: classic ?
            `-${2 * borderWidth}px ${2 * borderWidth}px 0 0 var(--bg-color)` :
            `0 0 0 ${borderWidth}px var(--bg-color)`,
          color: 'var(--level-player-text)',
          fontSize: fontSize,
          height: innerSize,
          lineHeight: innerSize + 'px',
          textAlign: 'center',
          verticalAlign: 'middle',
          width: innerSize,
        }}
      >
        <span className='theme-monkey-player' style={{ position: 'absolute', zIndex: 0, bottom: 0 }}>
          {icon({
            fontSize: fontSize,
            innerSize: innerSize,
            leastMoves: leastMoves,
            overstepped: overstepped,
            size: size,
            text: <>{text}</>,
            tileType: tileType,
          })}
        </span>
      </div>
    </div>;
  }

  return (
    <div className='absolute' style={parentStyle}>
      <div
        className={classNames(
          'cursor-default select-none z-20',
          leastMoves !== 0 && gameState.moveCount > leastMoves ? styles.extra : undefined,
          !atEnd ? undefined : leastMoves !== 0 && gameState.moveCount > leastMoves ? styles.lose :
            classic ? styles['win-classic'] : styles.win,
          classic ? styles.classic : undefined,
        )}
        id='player'
        style={{
          backgroundColor: 'var(--level-player)',
          borderColor: 'var(--level-player-extra)',
          borderWidth: classic ? 1 : 0,
          boxShadow: classic ?
            `-${2 * borderWidth}px ${2 * borderWidth}px 0 0 var(--bg-color)` :
            `0 0 0 ${borderWidth}px var(--bg-color)`,
          color: 'var(--level-player-text)',
          fontSize: fontSize,
          height: innerSize,
          lineHeight: innerSize + 'px',
          textAlign: 'center',
          verticalAlign: 'middle',
          width: innerSize,
        }}
      >
        {text}
      </div>
    </div>
  );
}
