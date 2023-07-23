import { AppContext } from '@root/contexts/appContext';
import { GridContext } from '@root/contexts/gridContext';
import classNames from 'classnames';
import React, { useContext } from 'react';
import Theme, { getIconFromTheme } from '../../../constants/theme';
import TileType from '../../../constants/tileType';
import styles from './Player.module.css';

interface PlayerProps {
  atEnd?: boolean;
  leastMoves: number;
  moveCount: number;
}

export default function Player({
  atEnd,
  leastMoves,
  moveCount,
}: PlayerProps) {
  const { borderWidth, innerTileSize, tileSize } = useContext(GridContext);
  const text = String(moveCount);
  const fontSizeRatio = text.length <= 3 ? 2 : (1 + (text.length - 1) / 2);
  const fontSize = innerTileSize / fontSizeRatio;
  const { theme } = useContext(AppContext);
  const classic = theme === Theme.Classic;
  const icon = getIconFromTheme(theme, TileType.Start);
  const overstepped = leastMoves !== 0 && moveCount > leastMoves;

  return (
    <div
      className={classNames(
        'select-none z-20 flex items-center justify-center relative',
        overstepped ? styles.extra : undefined,
        !atEnd ? undefined : overstepped ? styles.lose :
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
        height: innerTileSize,
        left: classic ? 2 * borderWidth : 0,
        lineHeight: innerTileSize + 'px',
        textAlign: 'center',
        top: 0,
        verticalAlign: 'middle',
        width: innerTileSize,
      }}
    >
      {icon ?
        <span className='theme-monkey-player absolute z-0 bottom-0'>
          {icon({
            fontSize: fontSize,
            overstepped: overstepped,
            size: tileSize,
            text: <>{text}</>,
          })}
        </span>
        :
        text
      }
    </div>
  );
}
