import TileType from '@root/constants/tileType';
import { AppContext } from '@root/contexts/appContext';
import TileTypeHelper from '@root/helpers/tileTypeHelper';
import classNames from 'classnames';
import React, { useContext, useState } from 'react';
import Theme from '../../constants/theme';
import Position from '../../models/position';
import styles from './Block.module.css';

interface BlockProps {
  borderWidth: number;
  inHole: boolean;
  onClick?: () => void;
  pos: Position;
  size: number;
  tileType: TileType;
}

export default function Block({ borderWidth, inHole, onClick, pos, size, tileType }: BlockProps) {
  // initialize the block at the starting position to avoid an animation from the top left
  const [initPos] = useState(new Position(pos.x, pos.y));
  const { theme } = useContext(AppContext);
  const classic = theme === Theme.Classic;
  const fillCenter = classic && tileType === TileType.Block;
  const innerBorderWidth = Math.round(size / 5);
  const innerSize = size - 2 * borderWidth;

  return (
    <div
      className={`block_type_${tileType}`}
      style={{
        transform: `translate(${(pos.x - initPos.x) * size}px, ${(pos.y - initPos.y) * size}px)`,
        transition: 'transform 0.1s',
      }}
    >
      <div
        className={classNames('cursor-default select-none absolute z-20',
          inHole ? styles['in-hole'] : undefined)}
        onClick={onClick}
        onTouchEnd={onClick}
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
          left: size * initPos.x + (classic ? 2 * borderWidth : borderWidth),
          top: size * initPos.y + (classic ? 0 : borderWidth),
          width: innerSize,
        }}
      />
    </div>
  );
}
