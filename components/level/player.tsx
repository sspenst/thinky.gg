import { AppContext } from '@root/contexts/appContext';
import classNames from 'classnames';
import React, { useCallback, useContext, useState } from 'react';
import Theme, { getIconFromTheme } from '../../constants/theme';
import TileType from '../../constants/tileType';
import Position from '../../models/position';
import styles from './Player.module.css';

interface PlayerProps {
  atEnd?: boolean;
  borderWidth: number;
  className?: string | undefined;
  handleClick?: () => void;
  leastMoves: number;
  moveCount: number;
  pos: Position;
  size: number;
}

export default function Player({
  atEnd,
  borderWidth,
  className,
  handleClick,
  leastMoves,
  moveCount,
  pos,
  size,
}: PlayerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onClick = useCallback((event: any) => {
    if (handleClick) {
      handleClick();
    }

    event.preventDefault();
  }, [handleClick]);

  // initialize the block at the starting position to avoid an animation from the top left
  const [initPos] = useState(new Position(pos.x, pos.y));
  const innerSize = size - 2 * borderWidth;
  const text = String(moveCount);
  const fontSizeRatio = text.length <= 3 ? 2 : (1 + (text.length - 1) / 2);
  const fontSize = innerSize / fontSizeRatio;
  const { theme } = useContext(AppContext);
  const classic = theme === Theme.Classic;
  const parentStyle = {
    backgroundColor: 'var(--bg-color)',
    height: classic ? size : innerSize,
    left: size * initPos.x + (classic ? 0 : borderWidth),
    top: size * initPos.y + (classic ? 0 : borderWidth),
    transform: `translate(${(pos.x - initPos.x) * size}px, ${(pos.y - initPos.y) * size}px)`,
    transition: 'transform 0.1s',
    width: classic ? size : innerSize,
  };
  const icon = getIconFromTheme(theme, TileType.Start);
  const overstepped = leastMoves !== 0 && moveCount > leastMoves;

  return (
    <div
      className={classNames('absolute', className)}
      onClick={onClick}
      onTouchEnd={(e) => onClick(e)}
      style={parentStyle}
    >
      <div
        className={classNames(
          'select-none z-20 flex items-center justify-center relative',
          overstepped ? styles.extra : undefined,
          !atEnd ? undefined : overstepped ? styles.lose :
            classic ? styles['win-classic'] : styles.win,
          classic ? styles.classic : undefined,
        )}
        id='player'
        style={{
          backgroundColor: 'var(--level-player)',
          borderColor: 'var(--level-player-extra)',
          borderWidth: classic ? 1 : 0,
          boxShadow: classic ?
            `-${2 * borderWidth}px ${2 * borderWidth}px 0 0 var(--bg-color)` :
            `0 0 0 ${borderWidth}px var(--bg-color)`,
          color: 'var(--level-player-text)',
          fontSize: fontSize,
          height: innerSize,
          left: classic ? 2 * borderWidth : 0,
          lineHeight: innerSize + 'px',
          textAlign: 'center',
          verticalAlign: 'middle',
          width: innerSize,
        }}
      >
        {icon ?
          <span className='theme-monkey-player absolute z-0 bottom-0'>
            {icon({
              fontSize: fontSize,
              overstepped: overstepped,
              size: size,
              text: <>{text}</>,
            })}
          </span>
          :
          text
        }
      </div>
    </div>
  );
}
