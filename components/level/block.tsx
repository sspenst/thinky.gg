import BlockState from '../../models/blockState';
import LevelDataType from '../../constants/levelDataType';
import Movable from './movable';
import React from 'react';

interface BlockProps {
  block: BlockState;
  borderWidth: number;
  size: number;
}

export default function Block({ block, borderWidth, size }: BlockProps) {
  const fillCenter = (document.body.className === 'theme-classic') && block.type === LevelDataType.Block;
  const innerBorderWidth = Math.round(size / 5);
  const innerSize = size - 2 * borderWidth;

  return (
    <Movable
      borderWidth={borderWidth}
      position={block.pos}
      size={size}
    >
      <div
        style={{
          backgroundColor: fillCenter ? 'var(--level-block-border)' : 'var(--level-block)',
          borderBottomWidth: LevelDataType.canMoveUp(block.type) ? innerBorderWidth : 0,
          borderColor: 'var(--level-block-border)',
          borderLeftWidth: LevelDataType.canMoveRight(block.type) ? innerBorderWidth : 0,
          borderRightWidth: LevelDataType.canMoveLeft(block.type) ? innerBorderWidth : 0,
          borderTopWidth: LevelDataType.canMoveDown(block.type) ? innerBorderWidth : 0,
          height: innerSize,
          width: innerSize,
        }}>
      </div>
    </Movable>
  );
}
