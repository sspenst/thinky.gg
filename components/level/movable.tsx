import Position from '../../models/position';
import React from 'react';
import Theme from '../../constants/theme';
import classNames from 'classnames';
import styles from './Movable.module.css';
import { useState } from 'react';

interface MovableProps {
  borderWidth: number;
  children: React.ReactNode;
  position: Position;
  size: number;
  transparent?: boolean;
}

export default function Movable({
  borderWidth,
  children,
  position,
  size,
  transparent = false,
}: MovableProps) {
  function getBorderWidth() {
    const classic = document.body.className === Theme.Classic;

    if (!classic) {
      return borderWidth;
    }

    return `0 0 ${2 * borderWidth}px ${2 * borderWidth}px`;
  }

  // initialize the block at the starting position to avoid an animation from the top left
  const [initPos] = useState(new Position(position.x, position.y));

  return (
    <div
      className={classNames('cursor-default select-none',
        transparent ? styles.transparent : undefined)}
      style={{
        backgroundColor: 'var(--bg-color)',
        borderColor: 'var(--level-grid-border)',
        borderWidth: getBorderWidth(),
        height: size,
        left: size * initPos.x,
        position: 'absolute',
        top: size * initPos.y,
        transform: `
          translateX(${(position.x - initPos.x) * 100}%)
          translateY(${(position.y - initPos.y) * 100}%)
        `,
        transition: 'transform 0.1s',
        width: size,
        zIndex: 1,
      }}
    >
      {children}
    </div>
  );
}
