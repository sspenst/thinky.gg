import { Game } from '@root/constants/Games';
import { GridContext } from '@root/contexts/gridContext';
import classNames from 'classnames';
import React, { useContext } from 'react';
import Theme, { getIconFromTheme } from '../../../constants/theme';
import TileType from '../../../constants/tileType';
import styles from './Player.module.css';

interface PlayerProps {
  atEnd?: boolean;
  game: Game;
  moveCount: number;
  onTopOf?: TileType;
  theme: Theme;
}

export default function Player({ atEnd, game, moveCount, onTopOf, theme }: PlayerProps) {
  const { borderWidth, hideText, innerTileSize, leastMoves, tileSize } = useContext(GridContext);
  const text = hideText ? '' : String(moveCount);
  const fontSizeRatio = text.length <= 3 ? 2 : (1 + (text.length - 1) / 2);
  const fontSize = innerTileSize / fontSizeRatio;

  const classic = theme === Theme.Classic;
  const icon = getIconFromTheme(game, theme, TileType.Player);
  const overstepped = leastMoves !== 0 && moveCount > leastMoves;

  return (
    <div
      className={classNames(
        'select-none z-20 flex items-center justify-center relative tile-type-4',
        'tile-' + game.id,
        overstepped ? styles.extra : undefined,
        !atEnd ? undefined : overstepped ? styles.lose :
          classic ? styles['win-classic'] : styles.win,
        classic ? styles.classic : undefined,
        onTopOf === TileType.Exit ? 'on-exit' : undefined,
      )}
      id='player'
      style={{
        // backgroundColor: 'var(--level-player)',
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
        top: 0,
        width: innerTileSize,
        backgroundColor: onTopOf === TileType.Exit ? 'var(--level-end)' : 'var(--level-player)',
      }}
    >
      {icon ?
        <span className={`${theme}-${TileType.Player}`}>
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
