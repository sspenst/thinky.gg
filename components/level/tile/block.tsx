import { Game, GameType } from '@root/constants/Games';
import TileType from '@root/constants/tileType';
import { GridContext } from '@root/contexts/gridContext';
import TileTypeHelper from '@root/helpers/tileTypeHelper';
import classNames from 'classnames';
import React, { useContext } from 'react';
import Theme from '../../../constants/theme';
import styles from './Block.module.css';

interface BlockProps {
  game: Game;
  theme: Theme;
  inHole: boolean;
  onTopOf?: TileType;
  tileType: TileType;
}

export default function Block({ game, inHole, onTopOf, theme, tileType }: BlockProps) {
  const { borderWidth, innerTileSize } = useContext(GridContext);

  const classic = theme === Theme.Classic;
  const innerBorderWidth = Math.round(innerTileSize / 4.5);

  function getBackgroundColor() {
    const fillCenter = classic && tileType === TileType.Block;

    return fillCenter ? 'var(--level-block-border)' : 'var(--level-block)';
  }

  return (
    <div
      className={classNames(
        'select-none relative z-20',
        'tile-type-' + tileType,
        'tile-' + game.id,
        inHole ? styles['in-hole'] : undefined,
        { 'on-exit': onTopOf === TileType.Exit },
      )}
      style={{
        backgroundColor: getBackgroundColor(),
        borderBottomWidth: TileTypeHelper.canMoveUp(tileType) ? innerBorderWidth : 0,
        borderColor: onTopOf === TileType.Exit && game.type === GameType.COMPLETE_AND_SHORTEST ? 'var(--level-end)' : 'var(--level-block-border)',
        borderLeftWidth: TileTypeHelper.canMoveRight(tileType) ? innerBorderWidth : 0,
        borderRightWidth: TileTypeHelper.canMoveLeft(tileType) ? innerBorderWidth : 0,
        borderTopWidth: TileTypeHelper.canMoveDown(tileType) ? innerBorderWidth : 0,
        boxShadow: classic ?
          `-${2 * borderWidth}px ${2 * borderWidth}px 0 0 var(--bg-color)` :
          `0 0 0 ${borderWidth}px var(--bg-color)`,
        height: innerTileSize,
        left: classic ? 2 * borderWidth : 0,
        top: 0,
        width: innerTileSize,
      }}
    />
  );
}
