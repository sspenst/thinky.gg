import Color from '../../constants/color';
import Position from '../../models/position';
import React from 'react';
import { useState } from 'react';

interface MovableProps {
  children: React.ReactNode;
  padding: number;
  position: Position;
  size: number;
}

export default function Movable({
  children,
  padding,
  position,
  size
}: MovableProps) {
  // initialize the block at the starting position to avoid an animation from the top left
  const [initPos] = useState(position.clone());

  return (
    <div
      className={'cursor-default select-none'}
      style={{
        backgroundColor: Color.Background,
        height: size,
        left: size * initPos.x,
        padding: padding,
        position: 'absolute',
        top: size * initPos.y,
        transform: `
          translateX(${(position.x - initPos.x) * 100}%)
          translateY(${(position.y - initPos.y) * 100}%)
        `,
        transition: 'transform 0.1s',
        width: size,
      }}
    >
      {children}
    </div>
  );
}
