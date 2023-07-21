import Position from '@root/models/position';
import React from 'react';
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
  isMovable?: boolean;
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
  isMovable,
  leastMoves,
  pos,
  size,
  text,
  tileType,
}: TileProps) {
  if (tileType === TileType.Start) {
    return (
      <Player
        atEnd={atEnd}
        borderWidth={borderWidth}
        className={className}
        handleClick={handleClick ? () => handleClick(false) : undefined}
        leastMoves={leastMoves}
        moveCount={text ?? 0}
        pos={pos}
        size={size}
      />
    );
  }

  // TODO: remove isMovable and combine Block and Square
  if (isMovable) {
    return (
      <Block
        borderWidth={borderWidth}
        inHole={inHole ?? false}
        onClick={() => handleClick ? handleClick(false) : undefined}
        pos={pos}
        size={size}
        tileType={tileType}
      />
    );
  }

  return (
    <Square
      borderWidth={borderWidth}
      className={className}
      handleClick={handleClick}
      inHole={inHole}
      leastMoves={leastMoves}
      pos={pos}
      size={size}
      text={text}
      tileType={tileType}
    />
  );
}
