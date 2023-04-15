import LevelUtil from '@root/constants/LevelUtil';
import { AppContext } from '@root/contexts/appContext';
import classNames from 'classnames';
import React, { useCallback, useContext } from 'react';
import Theme, { getIconFromTheme } from '../../constants/theme';
import { TileType } from '../../constants/tileType';
import isTheme from '../../helpers/isTheme';

interface SquareProps {
  borderWidth: number;
  handleClick?: (rightClick: boolean) => void;
  leastMoves: number;
  levelDataType: TileType;
  noBoxShadow?: boolean;
  size: number;
  text?: number;
}

export default function Square({
  borderWidth,
  handleClick,
  leastMoves,
  levelDataType,
  noBoxShadow,
  size,
  text
}: SquareProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onClick = useCallback((event: any) => {
    if (handleClick) {
      handleClick(event.type === 'contextmenu');
    }

    event.preventDefault();
  }, [handleClick]);

  const { user } = useContext(AppContext);
  const theme = user?.config.theme;
  const classic = isTheme(Theme.Classic);
  const innerSize = size - 2 * borderWidth;
  const innerBorderWidth = Math.round(innerSize / 4.5);
  const fontSizeRatio = text === undefined || String(text).length <= 3 ?
    2 : (1 + (String(text).length - 1) / 2);
  const fontSize = innerSize / fontSizeRatio * (classic ? 1.5 : 1);
  const overStepped = text !== undefined && leastMoves !== 0 && text > leastMoves;
  const textColor = overStepped ?
    'var(--level-grid-text-extra)' : 'var(--level-grid-text)';

  function getBackgroundColor() {
    switch (levelDataType) {
    case LevelUtil.Default:
      return text !== undefined ? 'var(--level-grid-used)' : 'var(--level-grid)';
    case LevelUtil.Wall:
      return 'var(--level-wall)';
    case LevelUtil.End:
      return 'var(--level-end)';
    case LevelUtil.Start:
      return 'var(--level-player)';
    case LevelUtil.Hole:
      return 'var(--level-hole)';
    case LevelUtil.Block:
      return classic ? 'var(--level-block-border)' : 'var(--level-block)';
    default:
      return 'var(--level-block)';
    }
  }

  let child = <div>{text}</div>;
  let style = {
  // NB: for some reason needed to put this first to get the color to work on refresh
    color: textColor,
    backgroundColor: getBackgroundColor(),
    borderBottomWidth: levelDataType === LevelUtil.Hole || LevelUtil.canMoveUp(levelDataType) ? innerBorderWidth : 0,
    borderColor: levelDataType === LevelUtil.Hole ? 'var(--level-hole-border)' : 'var(--level-block-border)',
    borderLeftWidth: levelDataType === LevelUtil.Hole || LevelUtil.canMoveRight(levelDataType) ? innerBorderWidth : 0,
    borderRightWidth: levelDataType === LevelUtil.Hole || LevelUtil.canMoveLeft(levelDataType) ? innerBorderWidth : 0,
    borderTopWidth: levelDataType === LevelUtil.Hole || LevelUtil.canMoveDown(levelDataType) ? innerBorderWidth : 0,
    boxShadow: noBoxShadow ? undefined : !classic ? `0 0 0 ${borderWidth}px 'var(--bg-color)` :
      levelDataType === LevelUtil.Wall ||
    levelDataType === LevelUtil.Start ||
    LevelUtil.canMove(levelDataType) ?
        `-${2 * borderWidth}px ${2 * borderWidth}px 0 0 var(--bg-color)` :
        `${2 * borderWidth}px -${2 * borderWidth}px 0 0 var(--bg-color)`,
    fontSize: fontSize,
    height: innerSize,
    lineHeight: innerSize * (classic ? 1.1 : 1) + 'px',
    width: innerSize,
  } as any;

  const icon = getIconFromTheme(theme, levelDataType);

  if (icon) {
    style = {
      ...style,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    };

    child = <span className={'theme-' + theme + '-' + levelDataType} style={{ position: 'absolute', zIndex: 0,

    }}>{icon({
        innerSize: innerSize / 1.5,
        fontSize: fontSize,
        levelDataType: levelDataType,
        size: size,
        text: <>{text}</>,
        leastMoves: leastMoves,
        overstepped: overStepped
      })}</span>;
  }

  return (
    <div
      className={classNames(
        `select-none block_type_${levelDataType} text-center align-middle`,
        { 'square-movable': LevelUtil.canMove(levelDataType) },
        { 'square-hole': levelDataType === LevelUtil.Hole },
      )}
      onClick={onClick}
      onContextMenu={onClick}
      onTouchEnd={(e) => onClick(e)}
      style={style}
    >
      {child}
    </div>
  );
}
