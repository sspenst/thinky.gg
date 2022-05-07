import LevelDataType from '../../constants/levelDataType';
import React from 'react';

interface SquareProps {
  borderWidth: number;
  leastMoves: number;
  levelDataType: LevelDataType;
  size: number;
  text?: number;
}

export default function Square({ borderWidth, leastMoves, levelDataType, size, text }: SquareProps) {
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
    const classic = document.body.className === 'theme-classic';

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

  const fillCenter = (document.body.className === 'theme-classic') && levelDataType === LevelDataType.Block;
  const innerBorderWidth = Math.round(size / 5);
  const innerSize = size - 2 * borderWidth;
  const fontSizeRatio = text === undefined || String(text).length <= 3 ?
    2 : (1 + (String(text).length - 1) / 2);
  const fontSize = innerSize / fontSizeRatio;
  const textColor = text !== undefined && text > leastMoves ? 'var(--level-grid-text-extra)' : 'var(--level-grid-text)';

  return (
    <div
      className='cursor-default select-none'
      style={{
        backgroundColor: getBackgroundColor(),
        borderColor: 'var(--bg-color)',
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
