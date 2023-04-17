import { AppContext } from '@root/contexts/appContext';
import TileTypeHelper from '@root/helpers/tileTypeHelper';
import classNames from 'classnames';
import React, { useCallback, useContext } from 'react';
import Theme, { getIconFromTheme } from '../../constants/theme';
import TileType from '../../constants/tileType';
import isTheme from '../../helpers/isTheme';

interface SquareProps {
  borderWidth: number;
  handleClick?: (rightClick: boolean) => void;
  leastMoves: number;
  noBoxShadow?: boolean;
  size: number;
  text?: number;
  tileType: TileType;
}

export default function Square({
  borderWidth,
  handleClick,
  leastMoves,
  noBoxShadow,
  size,
  text,
  tileType,
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
    switch (tileType) {
    case TileType.Default:
      return text !== undefined ? 'var(--level-grid-used)' : 'var(--level-grid)';
    case TileType.Wall:
      return 'var(--level-wall)';
    case TileType.End:
      return 'var(--level-end)';
    case TileType.Start:
      return 'var(--level-player)';
    case TileType.Hole:
      return 'var(--level-hole)';
    case TileType.Block:
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
    borderBottomWidth: tileType === TileType.Hole || TileTypeHelper.canMoveUp(tileType) ? innerBorderWidth : 0,
    borderColor: tileType === TileType.Hole ? 'var(--level-hole-border)' : 'var(--level-block-border)',
    borderLeftWidth: tileType === TileType.Hole || TileTypeHelper.canMoveRight(tileType) ? innerBorderWidth : 0,
    borderRightWidth: tileType === TileType.Hole || TileTypeHelper.canMoveLeft(tileType) ? innerBorderWidth : 0,
    borderTopWidth: tileType === TileType.Hole || TileTypeHelper.canMoveDown(tileType) ? innerBorderWidth : 0,
    boxShadow: noBoxShadow ? undefined : !classic ? `0 0 0 ${borderWidth}px 'var(--bg-color)` :
      tileType === TileType.Wall ||
    tileType === TileType.Start ||
    TileTypeHelper.canMove(tileType) ?
        `-${2 * borderWidth}px ${2 * borderWidth}px 0 0 var(--bg-color)` :
        `${2 * borderWidth}px -${2 * borderWidth}px 0 0 var(--bg-color)`,
    fontSize: fontSize,
    height: innerSize,
    lineHeight: innerSize * (classic ? 1.1 : 1) + 'px',
    width: innerSize,
  } as React.CSSProperties;

  const icon = getIconFromTheme(theme, tileType);

  if (icon) {
    style = {
      ...style,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    };

    child = (
      <span className={'theme-' + theme + '-' + tileType} style={{ position: 'absolute', zIndex: 0, }}>
        {icon({
          innerSize: innerSize / 1.5,
          fontSize: fontSize,
          tileType: tileType,
          size: size,
          text: <>{text}</>,
          leastMoves: leastMoves,
          overstepped: overStepped
        })}
      </span>
    );
  }

  return (
    <div
      className={classNames(
        `select-none block_type_${tileType} text-center align-middle`,
        { 'square-movable': TileTypeHelper.canMove(tileType) },
        { 'square-hole': tileType === TileType.Hole },
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
