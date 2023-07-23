import Theme from '@root/constants/theme';
import { AppContext } from '@root/contexts/appContext';
import { GridContext } from '@root/contexts/gridContext';
import Position from '@root/models/position';
import classNames from 'classnames';
import React, { useCallback, useContext, useMemo, useState } from 'react';
import TileType from '../../../constants/tileType';
import Block from './block';
import Player from './player';
import Square from './square';

interface TileProps {
  atEnd?: boolean;
  className?: string | undefined;
  handleClick?: (rightClick: boolean) => void;
  inHole?: boolean;
  leastMoves: number;
  pos: Position;
  text?: number | undefined;
  tileType: TileType;
}

export default function Tile({
  atEnd,
  className,
  handleClick,
  inHole,
  leastMoves,
  pos,
  text,
  tileType,
}: TileProps) {
  const { borderWidth, innerTileSize, tileSize } = useContext(GridContext);
  // initialize the block at the starting position to avoid an animation from the top left
  const [initPos] = useState(new Position(pos.x, pos.y));
  const { theme } = useContext(AppContext);
  const classic = theme === Theme.Classic;

  const onClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (handleClick) {
      handleClick(event.type === 'contextmenu');
      event.preventDefault();
    }
  }, [handleClick]);

  const tile = useMemo(() => {
    if (tileType === TileType.Start) {
      return (
        <Player
          atEnd={atEnd}
          leastMoves={leastMoves}
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
          leastMoves={leastMoves}
          text={text}
          tileType={tileType}
        />
      );
    }

    return (
      <Block
        inHole={inHole ?? false}
        tileType={tileType}
      />
    );
  }, [atEnd, inHole, leastMoves, text, tileType]);

  return (
    <div
      className={classNames(`absolute tile_type_${tileType}`, className)}
      onClick={onClick}
      onContextMenu={onClick}
      onTouchEnd={() => handleClick ? handleClick(false) : undefined}
      style={{
        backgroundColor: tileType === TileType.Start ? 'var(--bg-color)' : undefined,
        height: classic ? tileSize : innerTileSize,
        left: tileSize * initPos.x + (classic ? 0 : borderWidth),
        top: tileSize * initPos.y + (classic ? 0 : borderWidth),
        transform: `translate(${(pos.x - initPos.x) * tileSize}px, ${(pos.y - initPos.y) * tileSize}px)`,
        transition: 'transform 0.1s',
        width: classic ? tileSize : innerTileSize,
      }}
    >
      {tile}
    </div>
  );
}
