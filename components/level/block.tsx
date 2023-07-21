import TileType from '@root/constants/tileType';
import { AppContext } from '@root/contexts/appContext';
import TileTypeHelper from '@root/helpers/tileTypeHelper';
import classNames from 'classnames';
import React, { useContext } from 'react';
import Theme from '../../constants/theme';
import styles from './Block.module.css';

interface BlockProps {
  borderWidth: number;
  inHole: boolean;
  size: number;
  tileType: TileType;
}

export default function Block({ borderWidth, inHole, size, tileType }: BlockProps) {
  const { theme } = useContext(AppContext);
  const classic = theme === Theme.Classic;
  const fillCenter = classic && tileType === TileType.Block;
  const innerBorderWidth = Math.round(size / 5);
  const innerSize = size - 2 * borderWidth;

  return (
    <div
      className={classNames(
        'select-none absolute z-20',
        inHole ? styles['in-hole'] : undefined,
      )}
      style={{
        backgroundColor: fillCenter ? 'var(--level-block-border)' : 'var(--level-block)',
        borderBottomWidth: TileTypeHelper.canMoveUp(tileType) ? innerBorderWidth : 0,
        borderColor: 'var(--level-block-border)',
        borderLeftWidth: TileTypeHelper.canMoveRight(tileType) ? innerBorderWidth : 0,
        borderRightWidth: TileTypeHelper.canMoveLeft(tileType) ? innerBorderWidth : 0,
        borderTopWidth: TileTypeHelper.canMoveDown(tileType) ? innerBorderWidth : 0,
        boxShadow: classic ?
          `-${2 * borderWidth}px ${2 * borderWidth}px 0 0 var(--bg-color)` :
          `0 0 0 ${borderWidth}px var(--bg-color)`,
        height: innerSize,
        left: classic ? 2 * borderWidth : 0,
        top: 0,
        width: innerSize,
      }}
    />
  );
}
