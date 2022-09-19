import React, { useCallback } from 'react';
import LevelDataType from '../../constants/levelDataType';
import Theme from '../../constants/theme';

interface SquareProps {
  borderColor?: string;
  borderWidth: number;
  leastMoves: number;
  levelDataType: LevelDataType;
  onClick?: (clear: boolean) => void;
  size: number;
  text?: number;
}

export default function Square({
  borderColor,
  borderWidth,
  leastMoves,
  levelDataType,
  onClick,
  size,
  text
}: SquareProps) {
  function getBackgroundColor() {
    switch (levelDataType) {
    case LevelDataType.Wall:
      return 'var(--level-wall)';
    case LevelDataType.End:
      return 'var(--level-end)';
    case LevelDataType.Start:
      return 'var(--level-player)';
    default:
      return text !== undefined ? 'var(--level-grid-used)' : 'var(--level-grid)';
    }
  }

  function getBorderWidth() {
    const classic = document.body.classList.contains(Theme.Classic);

    if (!classic) {
      return borderWidth;
    }

    if (levelDataType === LevelDataType.Wall ||
      levelDataType === LevelDataType.Start ||
      LevelDataType.canMove(levelDataType)) {
      return `0 0 ${2 * borderWidth}px ${2 * borderWidth}px`;
    } else {
      return `${2 * borderWidth}px ${2 * borderWidth}px 0 0`;
    }
  }

  const handleClick = useCallback(event => {
    if (onClick) {
      onClick(event.type === 'contextmenu');
    }

    event.preventDefault();
  }, [onClick]);

  const fillCenter = (document.body.classList.contains(Theme.Classic)) && levelDataType === LevelDataType.Block;
  const innerSize = size - 2 * borderWidth;
  const innerBorderWidth = Math.round(innerSize / 4.5);
  const fontSizeRatio = text === undefined || String(text).length <= 3 ?
    2 : (1 + (String(text).length - 1) / 2);
  const fontSize = innerSize / fontSizeRatio;
  const textColor = text !== undefined && leastMoves !== 0 && text > leastMoves ?
    'var(--level-grid-text-extra)' : 'var(--level-grid-text)';

  return (
    <div
      className={'select-none block_type_' + levelDataType}
      onClick={handleClick}
      // ontouch too
      onTouchEnd={(e) => {
        handleClick(e);
      }}
      onContextMenu={handleClick}
      style={{
        backgroundColor: getBackgroundColor(),
        borderColor: borderColor ?? 'var(--level-grid-border)',
        borderWidth: getBorderWidth(),
        color: textColor,
        fontSize: fontSize,
        height: size,
        lineHeight: innerSize + 'px',
        textAlign: 'center',
        verticalAlign: 'middle',
        width: size,
      }}
    >
      {levelDataType === LevelDataType.Hole ?
        <div
          className='square-hole'
          style={{
            backgroundColor: 'var(--level-hole)',
            borderColor: 'var(--level-hole-border)',
            borderWidth: innerBorderWidth,
            height: innerSize,
            width: innerSize,
          }}
        >
        </div> :
        LevelDataType.canMove(levelDataType) ?
          <div
            className='square-movable'
            style={{
              backgroundColor: fillCenter ? 'var(--level-block-border)' : 'var(--level-block)',
              borderBottomWidth: LevelDataType.canMoveUp(levelDataType) ? innerBorderWidth : 0,
              borderColor: 'var(--level-block-border)',
              borderLeftWidth: LevelDataType.canMoveRight(levelDataType) ? innerBorderWidth : 0,
              borderRightWidth: LevelDataType.canMoveLeft(levelDataType) ? innerBorderWidth : 0,
              borderTopWidth: LevelDataType.canMoveDown(levelDataType) ? innerBorderWidth : 0,
              height: innerSize,
              width: innerSize,
            }}
          >
          </div> :
          text
      }
    </div>
  );
}
