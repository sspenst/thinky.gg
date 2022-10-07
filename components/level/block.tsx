import classNames from 'classnames';
import React, { useState } from 'react';
import LevelDataType from '../../constants/levelDataType';
import Theme from '../../constants/theme';
import BlockState from '../../models/blockState';
import Position from '../../models/position';
import styles from './Block.module.css';

interface BlockProps {
  block: BlockState;
  borderWidth: number;
  onClick: () => void;
  size: number;
}

export default function Block({ block, borderWidth, onClick, size }: BlockProps) {
  // initialize the block at the starting position to avoid an animation from the top left
  const [initPos] = useState(new Position(block.pos.x, block.pos.y));

  const classic = document.body.classList.contains(Theme.Classic);
  const fillCenter = classic && block.type === LevelDataType.Block;
  const innerBorderWidth = Math.round(size / 5);
  const innerSize = size - 2 * borderWidth;

  return (
    <div
      className={classNames(`block_type_${block.type} block_movable`)}
      style={{
        transform: `translate(${(block.pos.x - initPos.x) * size}px, ${(block.pos.y - initPos.y) * size}px)`,
        transition: 'transform 0.1s',
      }}
    >
      <div
        className={classNames('cursor-default select-none',
          block.inHole ? styles['in-hole'] : undefined)}
        onClick={onClick}
        onTouchEnd={onClick}
        style={{
          backgroundColor: fillCenter ? 'var(--level-block-border)' : 'var(--level-block)',
          borderBottomWidth: LevelDataType.canMoveUp(block.type) ? innerBorderWidth : 0,
          borderColor: 'var(--level-block-border)',
          borderLeftWidth: LevelDataType.canMoveRight(block.type) ? innerBorderWidth : 0,
          borderRightWidth: LevelDataType.canMoveLeft(block.type) ? innerBorderWidth : 0,
          borderTopWidth: LevelDataType.canMoveDown(block.type) ? innerBorderWidth : 0,
          boxShadow: classic ?
            `-${2 * borderWidth}px ${2 * borderWidth}px 0 0 var(--bg-color)` :
            `0 0 0 ${borderWidth}px var(--bg-color)`,
          height: innerSize,
          left: size * initPos.x + (classic ? 2 * borderWidth : borderWidth),
          position: 'absolute',
          top: size * initPos.y + (classic ? 0 : borderWidth),
          width: innerSize,
          zIndex: 2,
        }}
      />
    </div>
  );
}
