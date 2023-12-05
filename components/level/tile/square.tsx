import { AppContext } from '@root/contexts/appContext';
import { GridContext } from '@root/contexts/gridContext';
import TileTypeHelper from '@root/helpers/tileTypeHelper';
import React, { useContext } from 'react';
import Theme, { getIconFromTheme } from '../../../constants/theme';
import TileType from '../../../constants/tileType';

interface SquareProps {
  text?: number;
  tileType: TileType.Default | TileType.Wall | TileType.End | TileType.Hole;
}

export default function Square({ text, tileType }: SquareProps) {
  const { borderWidth, innerTileSize, leastMoves, tileSize } = useContext(GridContext);
  const { game, theme } = useContext(AppContext);
  const classic = theme === Theme.Classic;
  const innerBorderWidth = Math.round(innerTileSize / 4.5);
  const fontSizeRatio = text === undefined || String(text).length <= 3 ?
    2 : (1 + (String(text).length - 1) / 2);
  const fontSize = innerTileSize / fontSizeRatio * (classic ? 1.5 : 1);
  const overStepped = text !== undefined && leastMoves !== 0 && text > leastMoves;
  const textColor = overStepped ?
    'var(--level-player-extra)' : 'var(--level-grid-text)';

  function getBackgroundColor() {
    switch (tileType) {
    case TileType.Default:
      return text !== undefined ? 'var(--level-grid-used)' : 'var(--level-grid)';
    case TileType.Wall:
      return 'var(--level-wall)';
    case TileType.End:
      return 'var(--level-end)';
    case TileType.Hole:
      return 'var(--level-hole)';
    default:
      return undefined;
    }
  }

  const icon = getIconFromTheme(theme, tileType);

  return (
    <div
      className={`select-none tile-${game.id} tile-type-${tileType} flex items-center justify-center relative`}
      style={{
        backgroundColor: getBackgroundColor(),
        borderBottomWidth: tileType === TileType.Hole || TileTypeHelper.canMoveUp(tileType) ? innerBorderWidth : 0,
        borderColor: tileType === TileType.Hole ? 'var(--level-hole-border)' : 'var(--level-block-border)',
        borderLeftWidth: tileType === TileType.Hole || TileTypeHelper.canMoveRight(tileType) ? innerBorderWidth : 0,
        borderRightWidth: tileType === TileType.Hole || TileTypeHelper.canMoveLeft(tileType) ? innerBorderWidth : 0,
        borderTopWidth: tileType === TileType.Hole || TileTypeHelper.canMoveDown(tileType) ? innerBorderWidth : 0,
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
