import { AppContext } from '@root/contexts/appContext';
import TileTypeHelper from '@root/helpers/tileTypeHelper';
import Position from '@root/models/position';
import classNames from 'classnames';
import React, { useContext } from 'react';
import Theme from '../../constants/theme';
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
  const { theme } = useContext(AppContext);
  const classic = theme === Theme.Classic;

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
    <div
      className={classNames('absolute', className)}
      style={{
        left: size * pos.x + (!classic ? borderWidth : TileTypeHelper.isRaised(tileType) ? 2 * borderWidth : 0),
        top: size * pos.y + (!classic ? borderWidth : TileTypeHelper.isRaised(tileType) ? 0 : 2 * borderWidth),
      }}
    >
      <Square
        borderWidth={borderWidth}
        handleClick={handleClick}
        inHole={inHole}
        leastMoves={leastMoves}
        size={size}
        text={text}
        tileType={tileType}
      />
    </div>
  );
}
