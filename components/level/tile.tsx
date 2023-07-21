import Theme from '@root/constants/theme';
import { AppContext } from '@root/contexts/appContext';
import TileTypeHelper from '@root/helpers/tileTypeHelper';
import Position from '@root/models/position';
import classNames from 'classnames';
import React, { useCallback, useContext, useMemo, useState } from 'react';
import TileType from '../../constants/tileType';
import Block from './block';
import Player from './player';
import Square from './square';

interface TileProps {
  atEnd?: boolean;
  borderWidth: number;
  className?: string | undefined;
  handleClick?: (rightClick: boolean) => void;
  inHole?: boolean;
  leastMoves: number;
  pos: Position;
  size: number;
  text?: number | undefined;
  tileType: TileType;
}

export default function Tile({
  atEnd,
  borderWidth,
  className,
  handleClick,
  inHole,
  leastMoves,
  pos,
  size,
  text,
  tileType,
}: TileProps) {
  // initialize the block at the starting position to avoid an animation from the top left
  const [initPos] = useState(new Position(pos.x, pos.y));
  const innerSize = size - 2 * borderWidth;
  const { theme } = useContext(AppContext);
  const classic = theme === Theme.Classic;

  const onClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (handleClick) {
      handleClick(event.type === 'contextmenu');
      event.preventDefault();
    }
  }, [handleClick]);

  const innerTile = useMemo(() => {
    if (tileType === TileType.Start) {
      return (
        <Player
          atEnd={atEnd}
          borderWidth={borderWidth}
          leastMoves={leastMoves}
          moveCount={text ?? 0}
          size={size}
        />
      );
    }

    if (TileTypeHelper.canMove(tileType)) {
      return (
        <Block
          borderWidth={borderWidth}
          inHole={inHole ?? false}
          size={size}
          tileType={tileType}
        />
      );
    }

    return (
      <Square
        borderWidth={borderWidth}
        leastMoves={leastMoves}
        size={size}
        text={text}
        tileType={tileType}
      />
    );
  }, [atEnd, borderWidth, inHole, leastMoves, size, text, tileType]);

  return (
    <div
      className={classNames(`absolute tile_type_${tileType}`, className)}
      onClick={onClick}
      onContextMenu={onClick}
      onTouchEnd={() => handleClick ? handleClick(false) : undefined}
      style={{
        backgroundColor: tileType === TileType.Start ? 'var(--bg-color)' : undefined,
        height: classic ? size : innerSize,
        left: size * initPos.x + (classic ? 0 : borderWidth),
        top: size * initPos.y + (classic ? 0 : borderWidth),
        transform: `translate(${(pos.x - initPos.x) * size}px, ${(pos.y - initPos.y) * size}px)`,
        transition: 'transform 0.1s',
        width: classic ? size : innerSize,
      }}
    >
      {innerTile}
    </div>
  );
}
