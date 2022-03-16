import BlockState from '../../models/blockState';
import Color from '../../constants/color';
import LevelDataType from '../../constants/levelDataType';
import React from 'react';
import { useState } from 'react';

interface BlockProps {
  block: BlockState;
  size: number;
}

export default function Block({ block, size }: BlockProps) {
  // initialize the block at the starting position to avoid an animation from the top left
  const [initPos] = useState(block.pos.clone());
  const borderWidth = size * 0.2;

  return (
    <div
      style={{
        backgroundColor: Color.Background,
        height: size,
        left: size * initPos.x,
        padding: size * 0.03,
        position: 'absolute',
        top: size * initPos.y,
        transform: `
          translateX(${(block.pos.x - initPos.x) * 100}%)
          translateY(${(block.pos.y - initPos.y) * 100}%)
        `,
        transition: 'transform 0.1s',
        width: size,
      }}
      className={'cursor-default select-none'}
    >
      <div
        style={{
          backgroundColor: Color.Background,
          borderBottomWidth: LevelDataType.canMoveUp(block.type) ? borderWidth : 0,
          borderColor: Color.BlockBorder,
          borderLeftWidth: LevelDataType.canMoveRight(block.type) ? borderWidth : 0,
          borderRightWidth: LevelDataType.canMoveLeft(block.type) ? borderWidth : 0,
          borderTopWidth: LevelDataType.canMoveDown(block.type) ? borderWidth : 0,
          height: size * 0.94,
          width: size * 0.94,
        }}>
      </div>
    </div>
  );
}
