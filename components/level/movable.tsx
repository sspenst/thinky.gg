import classNames from 'classnames';
import React, { useState } from 'react';
import Theme from '../../constants/theme';
import Position from '../../models/position';
import styles from './Movable.module.css';

interface MovableProps {
  borderWidth: number;
  children: React.ReactNode;
  position: Position;
  size: number;
  transparent?: boolean;
  onClick?: () => void;
}

export default function Movable({
  borderWidth,
  children,
  position,
  size,
  transparent = false,
  onClick
}: MovableProps) {
  function getBorderWidth() {
    const classic = document.body.classList.contains(Theme.Classic);

    if (!classic) {
      return borderWidth;
    }

    return `0 0 ${2 * borderWidth}px ${2 * borderWidth}px`;
  }

  // initialize the block at the starting position to avoid an animation from the top left
  const [initPos] = useState(new Position(position.x, position.y));

  return (
    <div
      onClick={onClick}
      onTouchEnd={onClick}
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
        zIndex: 2,
      }}
    >
      {children}
    </div>
  );
}
