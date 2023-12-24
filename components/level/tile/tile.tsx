import Theme from '@root/constants/theme';
import { AppContext } from '@root/contexts/appContext';
import { GridContext } from '@root/contexts/gridContext';
import Position from '@root/models/position';
import classNames from 'classnames';
import { useTheme } from 'next-themes';
import React, { useContext, useMemo, useState } from 'react';
import TileType from '../../../constants/tileType';
import Block from './block';
import Player from './player';
import Square from './square';

interface TileProps {
  atEnd?: boolean;
  className?: string | undefined;
  disableAnimation?: boolean;
  handleClick?: (rightClick: boolean) => void;
  inHole?: boolean;
  pos: Position;
  text?: number | undefined;
  tileType: TileType;
  onTopOf?: TileType;
}

export default function Tile({
  atEnd,
  className,
  disableAnimation,
  handleClick,
  inHole,
  pos,
  text,
  tileType,
  onTopOf
}: TileProps) {
  const { borderWidth, innerTileSize, tileSize } = useContext(GridContext);
  const { game } = useContext(AppContext);
  // initialize the block at the starting position to avoid an animation from the top left
  const [initPos] = useState(new Position(pos.x, pos.y));
  const { theme } = useTheme();
  const classic = theme === Theme.Classic;

  function onClick(e: React.MouseEvent<HTMLDivElement>) {
    if (handleClick) {
      handleClick(e.type === 'contextmenu');
    }

    e.preventDefault();
  }

  function onTouch(e: React.TouchEvent<HTMLDivElement>) {
    if (handleClick) {
      handleClick(false);
    }

    e.preventDefault();
  }

  const tile = useMemo(() => {
    if (tileType === TileType.Start) {
      return (
        <Player
          atEnd={atEnd}
          moveCount={text ?? 0}
        />
      );
    }

    if (tileType === TileType.Default ||
      tileType === TileType.Wall ||
      tileType === TileType.End ||
      tileType === TileType.Hole
    ) {
      return (
        <Square
          text={text}
          tileType={tileType}
        />
      );
    }

    return (
      <Block
        inHole={inHole ?? false}
        tileType={tileType}
        onTopOf={onTopOf}
      />
    );
  }, [atEnd, inHole, onTopOf, text, tileType]);

  return (
    <div
      className={classNames(`absolute tile-${game.id} tile-type-${tileType}`, className)}
      onClick={onClick}
      onContextMenu={onClick}
      onTouchEnd={onTouch}
      style={{
        backgroundColor: tileType === TileType.Start ? 'var(--bg-color)' : undefined,
        height: classic ? tileSize : innerTileSize,
        left: tileSize * initPos.x + (classic ? 0 : borderWidth),
        top: tileSize * initPos.y + (classic ? 0 : borderWidth),
        transform: `translate(${(pos.x - initPos.x) * tileSize}px, ${(pos.y - initPos.y) * tileSize}px)`,
        transition: !disableAnimation ? 'transform 0.1s' : undefined,
        width: classic ? tileSize : innerTileSize,
      }}
    >
      {tile}
    </div>
  );
}
