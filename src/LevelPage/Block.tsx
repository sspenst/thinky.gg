import { useState } from 'react';
import React from 'react';
import Color from '../Constants/Color';
import LevelDataType from '../Constants/LevelDataType';
import Position from '../Models/Position';

interface BlockProps {
  color: string;
  position: Position;
  size: number;
  text?: string;
  textColor?: string;
  type: LevelDataType;
}

export default function Block(props: BlockProps) {
  // initialize the block at the starting position to avoid an animation from the top left
  const [initPos] = useState(props.position.clone());
  const fontSize = props.size * 0.5;
  const borderWidth = props.size * 0.2;

  return (
    <div
      style={{
        width: props.size,
        height: props.size,
        position: 'absolute',
        left: props.size * initPos.x,
        top: props.size * initPos.y,
        backgroundColor: props.color,
        textAlign: 'center',
        verticalAlign: 'middle',
        lineHeight: props.size + 'px',
        fontSize: fontSize,
        color: props.textColor,
        borderColor: Color.BlockBorder,
        borderLeftWidth: LevelDataType.canMoveRight(props.type) ? borderWidth : 0,
        borderTopWidth: LevelDataType.canMoveDown(props.type) ? borderWidth : 0,
        borderRightWidth: LevelDataType.canMoveLeft(props.type) ? borderWidth : 0,
        borderBottomWidth: LevelDataType.canMoveUp(props.type) ? borderWidth : 0,
        transform: `
          translateX(${(props.position.x - initPos.x) * 100}%)
          translateY(${(props.position.y - initPos.y) * 100}%)
        `,
        transition: 'transform 0.1s'
      }}
      className={'font-semibold cursor-default select-none'}
    >
      {props.text}
    </div>
  );
}
