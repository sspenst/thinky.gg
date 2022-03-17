import BlockState from '../../models/blockState';
import Color from '../../constants/color';
import LevelDataType from '../../constants/levelDataType';
import Movable from './movable';
import React from 'react';

interface BlockProps {
  block: BlockState;
  padding: number;
  size: number;
}

export default function Block({ block, padding, size }: BlockProps) {
  const borderWidth = Math.round(size / 5);
  const innerSize = size - 2 * padding;

  return (
    <Movable
      padding={padding}
      position={block.pos}
      size={size}
    >
      <div
        style={{
          backgroundColor: Color.Background,
          borderBottomWidth: LevelDataType.canMoveUp(block.type) ? borderWidth : 0,
          borderColor: 'rgb(162 115 70)',
          borderLeftWidth: LevelDataType.canMoveRight(block.type) ? borderWidth : 0,
          borderRightWidth: LevelDataType.canMoveLeft(block.type) ? borderWidth : 0,
          borderTopWidth: LevelDataType.canMoveDown(block.type) ? borderWidth : 0,
          height: innerSize,
          width: innerSize,
        }}>
      </div>
    </Movable>
  );
}
