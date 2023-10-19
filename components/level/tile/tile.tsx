import Theme from '@root/constants/theme';
import { AppContext } from '@root/contexts/appContext';
import { GridContext } from '@root/contexts/gridContext';
import Position from '@root/models/position';
import classNames from 'classnames';
import { gsap } from 'gsap';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import TileType from '../../../constants/tileType';
import Block from './block';
import Player from './player';
import Square from './square';

interface TileProps {
  atEnd?: boolean;
  className?: string | undefined;
  handleClick?: (rightClick: boolean) => void;
  inHole?: boolean;
  pos: Position;
  text?: number | undefined;
  tileType: TileType;
}

export default function Tile({
  atEnd,
  className,
  handleClick,
  inHole,
  pos,
  text,
  tileType,
}: TileProps) {
  const { borderWidth, innerTileSize, tileSize } = useContext(GridContext);
  // initialize the block at the starting position to avoid an animation from the top left
  const [initPos] = useState(new Position(pos.x, pos.y));
  const { theme } = useContext(AppContext);
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
      />
    );
  }, [atEnd, inHole, text, tileType]);

  const tileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (tileRef.current) {
      gsap.to(tileRef.current.style, {
        duration: .1, // duration in seconds, equivalent to 0.1s in your CSS transition
        transform: `translate(${(pos.x - initPos.x ) * tileSize}px, ${(pos.y - initPos.y ) * tileSize}px)`,
        // don't cancel the animation on subsequent renders
        overwrite: 'auto',
      });
    }
  }, [pos, initPos, tileSize]);

  return (
    <div
      ref={tileRef}
      className={classNames(`absolute tile-type-${tileType}`, className)}
      onClick={onClick}
      onContextMenu={onClick}
      onTouchEnd={onTouch}
      style={{
        backgroundColor: tileType === TileType.Start ? 'var(--bg-color)' : undefined,
        height: classic ? tileSize : innerTileSize,
        left: tileSize * initPos.x + (classic ? 0 : borderWidth),
        top: tileSize * initPos.y + (classic ? 0 : borderWidth),
        //  transform: `translate(${(pos.x - initPos.x + adjustment) * tileSize}px, ${(pos.y - initPos.y + adjustment) * tileSize}px)`,
        // add support for safari
        //  transition: 'transform 0.1s',
        width: classic ? tileSize : innerTileSize,
      }}
    >
      {tile}
    </div>
  );
}
