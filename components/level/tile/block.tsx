import { GameId } from '@root/constants/GameId';
import TileType from '@root/constants/tileType';
import { AppContext } from '@root/contexts/appContext';
import { GridContext } from '@root/contexts/gridContext';
import TileTypeHelper from '@root/helpers/tileTypeHelper';
import classNames from 'classnames';
import React, { useContext } from 'react';
import Theme from '../../../constants/theme';
import styles from './Block.module.css';

interface BlockProps {
  inHole: boolean;
  tileType: TileType;
  onTopOf?: TileType;
}

export default function Block({ inHole, tileType, onTopOf }: BlockProps) {
  const { borderWidth, innerTileSize } = useContext(GridContext);
  const { game, theme } = useContext(AppContext);
  const classic = theme === Theme.Classic;
  const innerBorderWidth = Math.round(innerTileSize / 4.5);

  function getBackgroundColor() {
    // For level editor, it'll be a blockOnExit. For regular game it'll have an onTopOf end
    if (game.id === GameId.SOKOBAN && onTopOf === TileType.End || tileType === TileType.BlockOnExit) {
      return 'var(--level-end)';
    } else {
      const fillCenter = classic && tileType === TileType.Block;

      return fillCenter ? 'var(--level-block-border)' : 'var(--level-block)';
    }
  }

  return (
    <div
      className={classNames(
        'select-none relative z-20',
        'tile-type-' + tileType,
        'tile-' + game.id,
        inHole ? styles['in-hole'] : undefined,
      )}
      style={{
        backgroundColor: getBackgroundColor(),
        borderBottomWidth: TileTypeHelper.canMoveUp(tileType) ? innerBorderWidth : 0,
        borderColor: 'var(--level-block-border)',
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
