import classNames from 'classnames';
import React, { useCallback } from 'react';
import LevelDataType from '../../constants/levelDataType';
import Theme from '../../constants/theme';

interface SquareProps {
  borderColor?: string;
  borderWidth: number;
  leastMoves: number;
  levelDataType: LevelDataType;
  onClick?: (rightClick: boolean) => void;
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
  const handleClick = useCallback(event => {
    if (onClick) {
      onClick(event.type === 'contextmenu');
    }

    event.preventDefault();
  }, [onClick]);

  const classic = document.body.classList.contains(Theme.Classic);
  const innerSize = size - 2 * borderWidth;
  const innerBorderWidth = Math.round(innerSize / 4.5);
  const fontSizeRatio = text === undefined || String(text).length <= 3 ?
    2 : (1 + (String(text).length - 1) / 2);
  const fontSize = innerSize / fontSizeRatio * (classic ? 1.5 : 1);
  const textColor = text !== undefined && leastMoves !== 0 && text > leastMoves ?
    'var(--level-grid-text-extra)' : 'var(--level-grid-text)';

  function getBackgroundColor() {
    switch (levelDataType) {
    case LevelDataType.Default:
      return text !== undefined ? 'var(--level-grid-used)' : 'var(--level-grid)';
    case LevelDataType.Wall:
      return 'var(--level-wall)';
    case LevelDataType.End:
      return 'var(--level-end)';
    case LevelDataType.Start:
      return 'var(--level-player)';
    case LevelDataType.Hole:
      return 'var(--level-hole)';
    case LevelDataType.Block:
      return classic ? 'var(--level-block-border)' : 'var(--level-block)';
    default:
      return 'var(--level-block)';
    }
  }

  return (
    <div
      className={classNames(
        `select-none block_type_${levelDataType}`,
        { 'square-movable': LevelDataType.canMove(levelDataType) },
      )}
      onClick={handleClick}
      onContextMenu={handleClick}
      onTouchEnd={(e) => handleClick(e)}
      style={{
        backgroundColor: getBackgroundColor(),
        borderBottomWidth: levelDataType === LevelDataType.Hole || LevelDataType.canMoveUp(levelDataType) ? innerBorderWidth : 0,
        borderColor: levelDataType === LevelDataType.Hole ? 'var(--level-hole-border)' : 'var(--level-block-border)',
        borderLeftWidth: levelDataType === LevelDataType.Hole || LevelDataType.canMoveRight(levelDataType) ? innerBorderWidth : 0,
        borderRightWidth: levelDataType === LevelDataType.Hole || LevelDataType.canMoveLeft(levelDataType) ? innerBorderWidth : 0,
        borderTopWidth: levelDataType === LevelDataType.Hole || LevelDataType.canMoveDown(levelDataType) ? innerBorderWidth : 0,
        boxShadow: !classic ? `0 0 0 ${borderWidth}px ${borderColor ?? 'var(--bg-color)'}` :
          levelDataType === LevelDataType.Wall ||
          levelDataType === LevelDataType.Start ||
          LevelDataType.canMove(levelDataType) ?
            `-${2 * borderWidth}px ${2 * borderWidth}px 0 0 ${borderColor ?? 'var(--bg-color)'}` :
            `${2 * borderWidth}px -${2 * borderWidth}px 0 0 ${borderColor ?? 'var(--bg-color)'}`,
        color: textColor,
        fontSize: fontSize,
        height: innerSize,
        lineHeight: innerSize * (classic ? 1.1 : 1) + 'px',
        textAlign: 'center',
        verticalAlign: 'middle',
        width: innerSize,
      }}
    >
      {text}
    </div>
  );
}
