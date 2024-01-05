import Direction from '@root/constants/direction';
import { GameType } from '@root/constants/Games';
import { AppContext } from '@root/contexts/appContext';
import { GridContext } from '@root/contexts/gridContext';
import TileTypeHelper from '@root/helpers/tileTypeHelper';
import { useTheme } from 'next-themes';
import React, { useContext } from 'react';
import Theme, { getIconFromTheme } from '../../../constants/theme';
import TileType from '../../../constants/tileType';

interface SquareProps {
  text?: number;
  tileType: TileType.Default | TileType.Wall | TileType.Exit | TileType.Hole;
  visited?: boolean;
}

export default function Square({ text, tileType, visited }: SquareProps) {
  const { borderWidth, innerTileSize, leastMoves, tileSize } = useContext(GridContext);
  const { game } = useContext(AppContext);
  const { theme } = useTheme();
  const classic = theme === Theme.Classic;
  const fontSizeRatio = text === undefined || String(text).length <= 3 ?
    2 : (1 + (String(text).length - 1) / 2);
  const fontSize = innerTileSize / fontSizeRatio * (classic ? 1.5 : 1);
  const overStepped = game.type === GameType.SHORTEST_PATH && text !== undefined && leastMoves !== 0 && text > leastMoves;
  const textColor = overStepped ?
    'var(--level-player-extra)' : 'var(--level-grid-text)';

  function getBackgroundColor() {
    switch (tileType) {
    case TileType.Default:
      return visited ? 'var(--level-grid-used)' : 'var(--level-grid)';
    case TileType.Wall:
      return 'var(--level-wall)';
    case TileType.Exit:
      return 'var(--level-end)';
    case TileType.Hole:
      return 'var(--level-hole)';
    default:
      return undefined;
    }
  }

  function getBorderWidth(direction: Direction) {
    if (
      (game.type === GameType.COMPLETE_AND_SHORTEST && tileType === TileType.Exit) ||
      tileType === TileType.Hole ||
      TileTypeHelper.canMoveInDirection(tileType, direction)
    ) {
      return Math.round(innerTileSize / 4.5);
    }

    return 0;
  }

  function getBorderColor() {
    if (game.type === GameType.COMPLETE_AND_SHORTEST && tileType === TileType.Exit) {
      return visited ? 'var(--level-grid-used)' : 'var(--level-grid)';
    }

    if (tileType === TileType.Hole) {
      return 'var(--level-hole-border)';
    }

    return 'var(--level-block-border)';
  }

  const icon = getIconFromTheme(game, theme, tileType);

  return (
    <div
      className={`select-none tile-${game.id} tile-type-${tileType} flex items-center justify-center relative`}
      style={{
        backgroundColor: getBackgroundColor(),
        borderBottomWidth: getBorderWidth(Direction.UP),
        borderColor: getBorderColor(),
        borderLeftWidth: getBorderWidth(Direction.RIGHT),
        borderRightWidth: getBorderWidth(Direction.LEFT),
        borderTopWidth: getBorderWidth(Direction.DOWN),
        boxShadow: !classic ? `0 0 0 ${borderWidth}px var(--bg-color)` :
          TileTypeHelper.isRaised(tileType) ?
            `-${2 * borderWidth}px ${2 * borderWidth}px 0 0 var(--bg-color)` :
            `${2 * borderWidth}px -${2 * borderWidth}px 0 0 var(--bg-color)`,
        color: textColor,
        fontSize: fontSize,
        height: innerTileSize,
        left: (!classic ? 0 : TileTypeHelper.isRaised(tileType) ? 2 * borderWidth : 0),
        lineHeight: innerTileSize * (classic ? 1.1 : 1) + 'px',
        top: (!classic ? 0 : TileTypeHelper.isRaised(tileType) ? 0 : 2 * borderWidth),
        width: innerTileSize,
      }}
    >
      {icon ?
        <span className={`${theme}-${tileType}`}>
          {icon({
            fontSize: fontSize,
            overstepped: overStepped,
            size: tileSize,
            text: <>{text}</>,
          })}
        </span>
        :
        text
      }
    </div>
  );
}
