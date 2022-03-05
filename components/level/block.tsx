import Color from '../../constants/color';
import LevelDataType from '../../constants/levelDataType';
import Position from '../../models/position';
import React from 'react';
import { useState } from 'react';

interface BlockProps {
  color: string;
  position: Position;
  size: number;
  text?: string;
  textColor?: string;
  type: LevelDataType;
}

export default function Block({ color, position, size, text, textColor, type }: BlockProps) {
  // initialize the block at the starting position to avoid an animation from the top left
  const [initPos] = useState(position.clone());
  const borderWidth = size * 0.2;

  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'absolute',
        left: size * initPos.x,
        top: size * initPos.y,
        backgroundColor: color,
        textAlign: 'center',
        verticalAlign: 'middle',
        lineHeight: size + 'px',
        fontSize: size * 0.5,
        color: textColor,
        borderColor: Color.BlockBorder,
        borderLeftWidth: LevelDataType.canMoveRight(type) ? borderWidth : 0,
        borderTopWidth: LevelDataType.canMoveDown(type) ? borderWidth : 0,
        borderRightWidth: LevelDataType.canMoveLeft(type) ? borderWidth : 0,
        borderBottomWidth: LevelDataType.canMoveUp(type) ? borderWidth : 0,
        transform: `
          translateX(${(position.x - initPos.x) * 100}%)
          translateY(${(position.y - initPos.y) * 100}%)
        `,
        transition: 'transform 0.1s'
      }}
      className={'font-semibold cursor-default select-none'}
    >
      {text}
    </div>
  );
}
